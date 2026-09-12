import React, { useEffect, useState } from 'react';
import { Crown } from 'lucide-react';
import { useData } from '../../context/DataContext';

const emptyPlan = { name: '', description: '', durationDays: '', price: '', discountPercent: 0, freeDelivery: false, extraPointsMultiplier: 1 };

export default function MembershipManager({ isAdminDark = true }) {
  const { customers, fetchCustomers } = useData();
  const [plans, setPlans] = useState([]);
  const [planForm, setPlanForm] = useState(emptyPlan);
  const [activation, setActivation] = useState({ customerId: '', planId: '', membershipNumber: '', amountPaid: '' });
  const [message, setMessage] = useState('');

  const loadPlans = async () => {
    const response = await fetch('/api/membership/plans');
    const result = await response.json().catch(() => []);
    if (!response.ok) throw new Error(result.error || 'Unable to load membership plans.');
    setPlans(result);
    setActivation(current => ({ ...current, planId: current.planId || String(result[0]?.id || '') }));
  };

  useEffect(() => {
    Promise.all([loadPlans(), fetchCustomers()]).catch(error => setMessage(error.message));
  }, [fetchCustomers]);

  const createPlan = async event => {
    event.preventDefault();
    const response = await fetch('/api/membership/plans', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...planForm, durationDays: Number(planForm.durationDays), price: Number(planForm.price), discountPercent: Number(planForm.discountPercent), extraPointsMultiplier: Number(planForm.extraPointsMultiplier) })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) return setMessage(result.error || 'Unable to create membership plan.');
    setPlanForm(emptyPlan);
    await loadPlans();
    setMessage('Membership plan created.');
  };

  const activate = async event => {
    event.preventDefault();
    const plan = plans.find(item => String(item.id) === String(activation.planId));
    const amountPaid = activation.amountPaid === '' ? Number(plan?.price) : Number(activation.amountPaid);
    const response = await fetch(`/api/customers/${activation.customerId}/memberships`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planId: Number(activation.planId), membershipNumber: activation.membershipNumber, amountPaid })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) return setMessage(result.error || 'Unable to activate membership.');
    await fetchCustomers();
    setActivation(current => ({ ...current, customerId: '', membershipNumber: '', amountPaid: '' }));
    setMessage('Membership activated and recorded in history.');
  };

  const cancel = async customer => {
    if (!window.confirm(`Cancel the active membership for ${customer.name}?`)) return;
    const response = await fetch(`/api/customers/${customer.id}/memberships/cancel-active`, { method: 'POST' });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) return setMessage(result.error || 'Unable to cancel membership.');
    await fetchCustomers();
    setMessage('Membership cancelled and retained in history.');
  };

  const panel = isAdminDark ? 'bg-slate-900 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900';
  const input = 'w-full rounded-xl border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-white';

  return (
    <div className="space-y-6">
      <div className={`rounded-2xl border p-5 ${panel}`}>
        <h2 className="flex items-center gap-2 text-lg font-black"><Crown className="h-5 w-5 text-amber-400" /> Membership plans and history</h2>
        <p className="mt-1 text-xs text-slate-400">Plans and customer status are read from membership_plan and customer_membership.</p>
        {message && <p className="mt-3 rounded-lg bg-cyan-950/50 p-2 text-xs text-cyan-200">{message}</p>}
      </div>

      <form onSubmit={createPlan} className={`grid gap-3 rounded-2xl border p-5 md:grid-cols-3 ${panel}`}>
        <h3 className="md:col-span-3 font-bold">Create plan</h3>
        <input required className={input} placeholder="Plan name" value={planForm.name} onChange={event => setPlanForm({ ...planForm, name: event.target.value })} />
        <input required type="number" min="1" className={input} placeholder="Duration (days)" value={planForm.durationDays} onChange={event => setPlanForm({ ...planForm, durationDays: event.target.value })} />
        <input required type="number" min="0" step="0.01" className={input} placeholder="Price" value={planForm.price} onChange={event => setPlanForm({ ...planForm, price: event.target.value })} />
        <textarea className={`${input} md:col-span-2`} placeholder="Description" value={planForm.description} onChange={event => setPlanForm({ ...planForm, description: event.target.value })} />
        <button className="rounded-xl bg-amber-500 px-4 py-2 font-black text-slate-950">Create plan</button>
      </form>

      <div className={`rounded-2xl border p-5 ${panel}`}>
        <h3 className="mb-3 font-bold">Configured active plans</h3>
        {plans.length === 0 ? <p className="text-sm text-slate-400">No active plans configured.</p> : plans.map(plan => (
          <div key={plan.id} className="mb-2 flex flex-wrap justify-between gap-2 rounded-xl border border-white/10 p-3 text-sm">
            <span className="font-bold">{plan.name}</span><span>₹{plan.price} · {plan.durationDays} days · {plan.discountPercent}% discount</span>
          </div>
        ))}
      </div>

      <form onSubmit={activate} className={`grid gap-3 rounded-2xl border p-5 md:grid-cols-2 ${panel}`}>
        <h3 className="md:col-span-2 font-bold">Activate customer membership</h3>
        <select required className={input} value={activation.customerId} onChange={event => setActivation({ ...activation, customerId: event.target.value })}>
          <option value="">Select customer</option>
          {customers.map(customer => <option key={customer.id} value={customer.id}>{customer.name} · {customer.phone}</option>)}
        </select>
        <select required className={input} value={activation.planId} onChange={event => setActivation({ ...activation, planId: event.target.value })}>
          <option value="">Select plan</option>
          {plans.map(plan => <option key={plan.id} value={plan.id}>{plan.name} · ₹{plan.price}</option>)}
        </select>
        <input required className={input} placeholder="Unique membership number" value={activation.membershipNumber} onChange={event => setActivation({ ...activation, membershipNumber: event.target.value })} />
        <input type="number" min="0" step="0.01" className={input} placeholder="Amount paid (defaults to plan price)" value={activation.amountPaid} onChange={event => setActivation({ ...activation, amountPaid: event.target.value })} />
        <button className="rounded-xl bg-amber-500 px-4 py-2 font-black text-slate-950 md:col-span-2">Activate membership</button>
      </form>

      <div className={`rounded-2xl border p-5 ${panel}`}>
        <h3 className="mb-3 font-bold">Active members</h3>
        {customers.filter(customer => customer.membershipStatus === 'Active').map(customer => (
          <div key={customer.id} className="mb-2 flex items-center justify-between gap-3 rounded-xl border border-white/10 p-3 text-sm">
            <span>{customer.name} · {customer.membershipNumber}</span>
            <button onClick={() => cancel(customer)} className="rounded-lg border border-rose-500/40 px-3 py-1 text-rose-300">Cancel</button>
          </div>
        ))}
      </div>
    </div>
  );
}
