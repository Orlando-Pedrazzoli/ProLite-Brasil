// 📄 src/components/shared/ChatwootWidget.tsx
// Chat de atendimento (Chatwoot Cloud) — widget do site.
//
// Decisões:
// - Carregamento tardio: o SDK só é injetado depois de o visitante decidir
//   o banner de cookies (qualquer decisão) e com o browser ocioso. Assim o
//   balão não tapa os botões do banner nem pesa no LCP.
// - Fora do admin/PDV: nessas rotas o SDK nem carrega; se já estiver
//   carregado (navegação client-side), o balão é escondido.
// - Cliente logado é identificado (nome + e-mail) com validação HMAC:
//   o hash é gerado no servidor em /api/chatwoot/identity, o segredo nunca
//   vai para o browser. No logout a sessão do chat é limpa (reset).
// - O token do widget é público (aparece no HTML de qualquer visitante),
//   por isso vive em company.chatwoot e não em variável de ambiente.
'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { company } from '@/lib/config/company';
import { getCookieConsent } from '@/components/shared/CookieConsent';

interface ChatwootUser {
  name?: string;
  email?: string;
  identifier_hash?: string;
}

interface ChatwootApi {
  setUser: (identifier: string, user: ChatwootUser) => void;
  reset: () => void;
  toggleBubbleVisibility: (state: 'show' | 'hide') => void;
}

declare global {
  interface Window {
    chatwootSettings?: Record<string, unknown>;
    chatwootSDK?: {
      run: (config: { websiteToken: string; baseUrl: string }) => void;
    };
    $chatwoot?: ChatwootApi;
  }
}

const { baseUrl: BASE_URL, websiteToken: WEBSITE_TOKEN } = company.chatwoot;

// Rotas internas onde o chat de atendimento ao cliente não deve aparecer.
const HIDDEN_PREFIXES = ['/admin', '/pos'];

function subscribeConsent(onChange: () => void) {
  window.addEventListener('cookie-consent-updated', onChange);
  return () =>
    window.removeEventListener('cookie-consent-updated', onChange);
}

export default function ChatwootWidget() {
  const pathname = usePathname() || '/';
  const { data: session, status } = useSession();
  // 1. Espera a decisão do banner de cookies (lida do localStorage)
  const consentDecided = useSyncExternalStore(
    subscribeConsent,
    () => getCookieConsent() !== null,
    () => false,
  );
  const [ready, setReady] = useState(false);
  const injected = useRef(false);
  const identifiedAs = useRef<string | null>(null);

  const hidden = HIDDEN_PREFIXES.some((p) => pathname.startsWith(p));
  const userId = session?.user?.id ?? null;
  const userName = session?.user?.name ?? undefined;
  const userEmail = session?.user?.email ?? undefined;

  // 2. Injeta o SDK uma única vez
  useEffect(() => {
    if (!WEBSITE_TOKEN || !consentDecided || hidden || injected.current) return;
    injected.current = true;

    const onReady = () => setReady(true);
    window.addEventListener('chatwoot:ready', onReady);

    window.chatwootSettings = {
      locale: 'pt_BR',
      position: 'right',
      type: 'standard',
      darkMode: 'light',
    };

    const inject = () => {
      const script = document.createElement('script');
      script.src = `${BASE_URL}/packs/js/sdk.js`;
      script.async = true;
      script.onload = () => {
        window.chatwootSDK?.run({
          websiteToken: WEBSITE_TOKEN,
          baseUrl: BASE_URL,
        });
      };
      document.body.appendChild(script);
    };

    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(inject, { timeout: 4000 });
    } else {
      setTimeout(inject, 2000);
    }
    // O listener fica vivo durante toda a sessão da página (o componente
    // mora no layout raiz e nunca desmonta).
  }, [consentDecided, hidden]);

  // 3. Esconde o balão no admin/PDV, mostra no resto
  useEffect(() => {
    if (!ready) return;
    window.$chatwoot?.toggleBubbleVisibility(hidden ? 'hide' : 'show');
  }, [ready, hidden]);

  // 4. Identifica o cliente logado / limpa no logout
  useEffect(() => {
    if (!ready || status === 'loading') return;

    if (status === 'unauthenticated') {
      if (identifiedAs.current) {
        window.$chatwoot?.reset();
        identifiedAs.current = null;
      }
      return;
    }

    if (!userId || identifiedAs.current === userId) return;

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/chatwoot/identity', {
          cache: 'no-store',
        });
        if (!res.ok) return;
        const data = (await res.json()) as {
          identifier?: string;
          identifierHash?: string | null;
        };
        if (cancelled || !data.identifier) return;
        window.$chatwoot?.setUser(data.identifier, {
          name: userName,
          email: userEmail,
          ...(data.identifierHash
            ? { identifier_hash: data.identifierHash }
            : {}),
        });
        identifiedAs.current = data.identifier;
      } catch {
        // Sem identificação o chat continua a funcionar como visitante.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [ready, status, userId, userName, userEmail]);

  return null;
}
