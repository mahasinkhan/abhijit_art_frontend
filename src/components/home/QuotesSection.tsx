import { motion } from 'framer-motion';
import '../../styles/quotes.css';

type Quote = {
  text: string;
  name: string;
  role: string;
  initials: string;
};

/* The six real testimonials already on this page. */
const QUOTES: Quote[] = [
  {
    text: 'Abhijit Art provides the best quality printing services. Fast delivery and amazing work, highly recommended!',
    name: 'Rahul Sharma',
    role: 'Business Owner, Sharma Traders',
    initials: 'RS',
  },
  {
    text: 'From our shop signage to flex banners, everything was crisp and delivered on time. The team understood exactly what we wanted.',
    name: 'Priya Das',
    role: 'Marketing Head, Das Retail Group',
    initials: 'PD',
  },
  {
    text: 'We order all our event standees and stickers here. Consistent quality, fair pricing, and they never miss a deadline.',
    name: 'Amit Roy',
    role: 'Event Manager, Roy Events',
    initials: 'AR',
  },
  {
    text: 'Our visiting cards and PVC tags came out beautifully. The finishing quality is genuinely premium.',
    name: 'Sneha Paul',
    role: 'Founder, Paul Boutique',
    initials: 'SP',
  },
  {
    text: 'Their LED signboard transformed our storefront: bright, clean, and installed without any hassle.',
    name: 'Tarun Ghosh',
    role: 'Owner, Ghosh Sweets',
    initials: 'TG',
  },
  {
    text: 'Reliable for bulk printing. Whenever we need urgent orders, they always come through on time.',
    name: 'Mou Sen',
    role: 'Manager, Sen Pharmacy',
    initials: 'MS',
  },
];

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * One column looping upward forever. The list is rendered twice and
 * the run travels exactly -50%, so the second copy lands where the
 * first began and the seam is invisible.
 */
function Column({ quotes, duration }: { quotes: Quote[]; duration: number }) {
  /* Rendered twice so the -50% travel lands the second copy exactly
     where the first began, making the seam invisible. */
  const run = [...quotes, ...quotes];

  return (
    <div className="ap-quotes-col">
      <motion.div
        className="ap-quotes-run"
        animate={{ translateY: '-50%' }}
        transition={{ duration, repeat: Infinity, ease: 'linear', repeatType: 'loop' }}
      >
        {run.map((q, i) => (
          <figure className="ap-quote" key={`${q.name}-${i}`}>
            <span className="ap-quote-mark" aria-hidden="true">&ldquo;</span>
            <p>{q.text}</p>
            <figcaption className="ap-quote-by">
              <span className="ap-quote-initials" aria-hidden="true">{q.initials}</span>
              <span>
                <b>{q.name}</b>
                <span>{q.role}</span>
              </span>
            </figcaption>
          </figure>
        ))}
      </motion.div>
    </div>
  );
}

export default function QuotesSection() {
  return (
    <section className="ap-sec">
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
              <span>In their words</span>
            </motion.div>

            <motion.h2
              className="ap-h2"
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.7, delay: 0.05, ease: EASE }}
            >
              What our clients say
            </motion.h2>
            <p className="ap-sub">Shops, clinics and event teams across Murshidabad.</p>
          </div>
        </div>

        <div className="ap-quotes-stage">
          <Column quotes={QUOTES.slice(0, 2)} duration={22} />
          <Column quotes={QUOTES.slice(2, 4)} duration={28} />
          <Column quotes={QUOTES.slice(4, 6)} duration={25} />
        </div>
      </div>
    </section>
  );
}
