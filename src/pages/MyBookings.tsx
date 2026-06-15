import { useEffect, useState } from "react";
import api from "../api";

interface Booking {
  _id: string;
  serviceName: string;
  quantity: number;
  notes: string;
  status: string;
  createdAt: string;
}

export default function MyBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);

  useEffect(() => {
    api.get("/bookings/mine").then((res) => setBookings(res.data));
  }, []);

  return (
    <div>
      <h2>My Bookings</h2>
      {bookings.length === 0 && <p className="muted">You haven't booked anything yet.</p>}
      <div className="grid">
        {bookings.map((b) => (
          <div key={b._id} className="card">
            <h3>{b.serviceName}</h3>
            <p className="muted">Quantity: {b.quantity}</p>
            {b.notes && <p className="muted">Note: {b.notes}</p>}
            <span className={`badge ${b.status}`}>{b.status}</span>
            <p className="date">{new Date(b.createdAt).toLocaleString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
}