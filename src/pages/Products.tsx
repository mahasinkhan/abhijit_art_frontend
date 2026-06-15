const products = [
  { icon: "🖼️", name: "Flex Banner", description: "Custom size flex banners for shops, events and hoardings.", price: "Starting ₹50/sqft" },
  { icon: "🔆", name: "Laser Cut Items", description: "Acrylic and wood laser cut designs, name boards and trophies.", price: "Starting ₹200" },
  { icon: "🖨️", name: "Digital Prints", description: "A4, A3 and custom size digital prints on glossy or matte paper.", price: "Starting ₹10" },
  { icon: "✂️", name: "Custom Stickers", description: "Waterproof vinyl stickers in any shape and size.", price: "Starting ₹5/piece" },
  { icon: "📑", name: "Rubber Stamps", description: "Self-inking and rubber stamps for offices and businesses.", price: "Starting ₹150" },
  { icon: "🪪", name: "ID Cards", description: "PVC ID cards with lanyard and holder for schools and offices.", price: "Starting ₹30/card" },
  { icon: "💳", name: "Visiting Cards", description: "Premium quality visiting cards with your design.", price: "Starting ₹200/100pcs" },
  { icon: "☕", name: "Printed Mugs", description: "Custom photo and logo printed ceramic mugs.", price: "Starting ₹250/mug" },
  { icon: "💡", name: "LED Modules", description: "LED strip modules for glow signs and display boards.", price: "Starting ₹500" },
];

export default function Products() {
  return (
    <div>
      <div className="hero">
        <h1>Our Products</h1>
        <p className="tagline">
          High quality products made to order. Fast delivery. Best prices.
        </p>
      </div>
      <div className="section">
        <div className="grid">
          {products.map((p) => (
            <div key={p.name} className="card product-card">
              <div className="icon">{p.icon}</div>
              <h3>{p.name}</h3>
              <p className="muted">{p.description}</p>
              <p className="price">{p.price}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}