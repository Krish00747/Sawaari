// Fake dashboard data for the on-camera rider. Edit freely — it's set dressing.
// The story: a rider working long night shifts, earning little, with cash dues piling up.

export type OrderStatus = 'delivered' | 'cancelled' | 'penalty';

export type Order = {
  id: string;
  time: string;
  from: string;
  to: string;
  km: number;
  status: OrderStatus;
  amount: number; // ₹, negative for deductions
  note?: string;
};

export const today = {
  earnings: 186,
  orders: 4,
  loginTime: '10h 12m',
  targetOrders: 12,
  targetBonus: 120,
};

export const wallet = {
  balance: -1240,
  depositDeadline: 'tonight, 11:59 PM',
};

export const rating = { value: 4.1, threshold: 4.3 };

// Last 7 days, oldest first. Earnings sliding downward.
export const week: { day: string; amount: number }[] = [
  { day: 'Fri', amount: 612 },
  { day: 'Sat', amount: 548 },
  { day: 'Sun', amount: 590 },
  { day: 'Mon', amount: 402 },
  { day: 'Tue', amount: 355 },
  { day: 'Wed', amount: 298 },
  { day: 'Thu', amount: 186 },
];

export const orders: Order[] = [
  {
    id: 'SW-48213',
    time: '11:42 PM',
    from: 'Shree Sagar Lunch Home',
    to: 'Ring Road, Sector 4',
    km: 3.8,
    status: 'penalty',
    amount: -25,
    note: 'Late delivery (+14 min)',
  },
  {
    id: 'SW-48177',
    time: '10:58 PM',
    from: 'Midnight Biryani Point',
    to: 'Railway Colony',
    km: 5.1,
    status: 'delivered',
    amount: 41,
  },
  {
    id: 'SW-48102',
    time: '10:05 PM',
    from: 'Daily Fresh Mart',
    to: 'Old Market Road',
    km: 2.4,
    status: 'cancelled',
    amount: 0,
    note: 'Cancelled by customer after pickup',
  },
  {
    id: 'SW-48056',
    time: '9:21 PM',
    from: 'Hotel Annapoorna',
    to: 'Gandhi Nagar, Lane 7',
    km: 4.6,
    status: 'delivered',
    amount: 34,
  },
  {
    id: 'SW-47990',
    time: '8:37 PM',
    from: 'Sai Medicals',
    to: 'Shanti Apartments',
    km: 1.9,
    status: 'delivered',
    amount: 28,
    note: 'Tip: ₹0',
  },
  {
    id: 'SW-47931',
    time: '7:50 PM',
    from: 'Chai Adda',
    to: 'Bus Stand',
    km: 1.2,
    status: 'penalty',
    amount: -10,
    note: 'Order rejection fee',
  },
];

export const loanOffer = {
  amount: 5000,
  rate: '3% per week',
};

export const rupee = (n: number) => `${n < 0 ? '−' : ''}₹${Math.abs(n).toLocaleString('en-IN')}`;
