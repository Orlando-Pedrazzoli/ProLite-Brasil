import SectionHeading from '@/components/home/SectionHeading';

export default function NewArrivals() {
  return (
    <section className="py-16">
      <div className="container-home">
        <SectionHeading eyebrow="Acabou de chegar" title="Novidades" />
        <p className="text-gray-500">Novos produtos chegando em breve...</p>
      </div>
    </section>
  );
}
