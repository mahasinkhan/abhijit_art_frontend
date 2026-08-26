import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import '../../styles/prices.css';

const EASE = [0.22, 1, 0.36, 1] as const;

/* Prices carried over from the products list already on this page.
   Rupee sign written as an entity so the source stays pure ASCII. */
const PRICES = [
  { name: 'Stickers', from: '199' },
  { name: 'Visiting Cards', from: '299' },
  { name: 'Custom T-Shirts', from: '299' },
  { name: 'Printed Mugs', from: '349' },
  { name: 'Name Plates', from: '599' },
  { name: 'LED Boards', from: '1,499' },
];

export default function PricesSection() {
  return (
    <section className="ap-sec ap-sec--warm">
      <div className="ap-shell">
        <div className="ap-sec-head">
          <div>
            <motion.div
              className="ap-eyebrow"
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.6, ease: EASE }}
            >
              <i />
              <span>Starting prices</span>
            </motion.div>

            <motion.h2
              className="ap-h2"
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.7, delay: 0.05, ease: EASE }}
            >
              What it costs
            </motion.h2>
            <p className="ap-sub">No hidden charges, no minimum order.</p>
          </div>

          <Link className="ap-more" to="/services">
            Full price list &#8594;
          </Link>
        </div>

        <div className="ap-price-grid">
          {PRICES.map((p, i) => (
            <motion.div
              key={p.name}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.5, delay: (i % 3) * 0.08, ease: EASE }}
            >
              <Link className="ap-price-row" to="/services">
                <span className="ap-price-name">{p.name}</span>
                <span className="ap-price-lead" aria-hidden="true" />
                <span className="ap-price-val">
                  <i>from</i>
                  <b>&#8377;{p.from}</b>
                </span>
              </Link>
            </motion.div>
          ))}
        </div>

        <p className="ap-price-note">
          Indicative starting prices. The final quote depends on size, material,
          finishing and quantity &mdash; send us the details and we will confirm before
          anything goes on the press.
        </p>
      </div>
    </section>
  );
}
