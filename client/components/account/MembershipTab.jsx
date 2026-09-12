import React, { useEffect, useState } from 'react';
import { Crown, CheckCircle2, AlertCircle } from 'lucide-react';

function parseBenefits(value) {
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function MembershipTab({ profile, setProfile, setShowPrimePayment, isHindi }) {
  const [plans, setPlans] = useState([]);
  const [memberships, setMemberships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadMembershipData = async () => {
    if (!profile?.id) return;
    setLoading(true);
    setError('');
    try {
      const [plansResponse, historyResponse] = await Promise.all([
        fetch('/api/membership/plans'),
        fetch(`/api/customers/${profile.id}/memberships`)
      ]);
      const planRows = await plansResponse.json().catch(() => []);
      const historyRows = await historyResponse.json().catch(() => []);
      if (!plansResponse.ok || !historyResponse.ok) throw new Error('Unable to load membership data.');
      setPlans(Array.isArray(planRows) ? planRows : []);
      setMemberships(Array.isArray(historyRows) ? historyRows : []);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadMembershipData(); }, [profile?.id]);

  const activeMembership = memberships.find(item => String(item.status).toLowerCase() === 'active') || null;
  const activePlan = plans.find(plan => Number(plan.id) === Number(activeMembership?.membership_plan_id)) || plans[0] || null;
  const benefits = parseBenefits(activePlan?.benefitsJson);

  const cancelMembership = async () => {
    if (!activeMembership || !window.confirm(isHindi ? 'क्या आप सदस्यता रद्द करना चाहते हैं?' : 'Cancel this membership?')) return;
    const response = await fetch(`/api/customers/me/memberships/${activeMembership.id}/cancel`, { method: 'POST' });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) { setError(result.error || 'Unable to cancel membership.'); return; }
    setProfile(previous => ({ ...previous, membershipStatus: 'Cancelled' }));
    await loadMembershipData();
  };

  if (loading) return <div className="p-6 text-sm text-slate-500">{isHindi ? 'सदस्यता लोड हो रही है…' : 'Loading membership…'}</div>;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm text-slate-900 space-y-5">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <h3 className="font-extrabold text-base uppercase tracking-wider flex items-center gap-2">
          <Crown className="h-5 w-5 text-amber-500" />
          <span>{isHindi ? 'सदस्यता' : 'Membership'}</span>
        </h3>
        <span className={`px-3 py-1 rounded-full text-xs font-black uppercase ${activeMembership ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
          {activeMembership ? activeMembership.status : (isHindi ? 'सक्रिय नहीं' : 'Not active')}
        </span>
      </div>

      {error && <div className="p-3 rounded-xl bg-rose-50 text-rose-800 text-xs flex gap-2"><AlertCircle className="h-4 w-4" />{error}</div>}

      {activeMembership ? (
        <div className="rounded-2xl bg-amber-50 border border-amber-200 p-5 space-y-3">
          <h4 className="font-black text-amber-900">{activeMembership.plan_name}</h4>
          <div className="grid sm:grid-cols-2 gap-2 text-xs text-slate-700">
            <p>{isHindi ? 'सदस्य संख्या' : 'Membership no.'}: <strong>{activeMembership.membership_no}</strong></p>
            <p>{isHindi ? 'समाप्ति' : 'Expires'}: <strong>{activeMembership.end_date}</strong></p>
            <p>{isHindi ? 'भुगतान' : 'Amount paid'}: <strong>₹{Number(activeMembership.amount_paid).toFixed(2)}</strong></p>
          </div>
          <button type="button" onClick={cancelMembership} className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold">
            {isHindi ? 'सदस्यता रद्द करें' : 'Cancel membership'}
          </button>
        </div>
      ) : activePlan ? (
        <div className="grid lg:grid-cols-2 gap-5">
          <div className="rounded-2xl bg-amber-50 border border-amber-200 p-5 space-y-3">
            <h4 className="font-black text-amber-900">{activePlan.name}</h4>
            {activePlan.description && <p className="text-xs text-slate-600">{activePlan.description}</p>}
            <p className="text-xl font-black text-amber-700">₹{Number(activePlan.price).toFixed(2)}</p>
            <p className="text-xs text-slate-500">{activePlan.durationDays} {isHindi ? 'दिन' : 'days'}</p>
            <button type="button" onClick={() => setShowPrimePayment(true)} className="w-full py-2.5 rounded-xl bg-amber-500 text-slate-950 text-xs font-black uppercase">
              {isHindi ? 'सदस्यता खरीदें' : 'Purchase membership'}
            </button>
          </div>
          <ul className="space-y-2 text-xs text-slate-700">
            {benefits.map((benefit, index) => <li key={index} className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />{String(benefit)}</li>)}
          </ul>
        </div>
      ) : (
        <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 text-sm text-slate-600">
          {isHindi ? 'कोई सक्रिय सदस्यता योजना कॉन्फ़िगर नहीं है।' : 'No active membership plan is configured.'}
        </div>
      )}

      {memberships.length > 0 && (
        <div>
          <h4 className="text-xs font-black uppercase text-slate-500 mb-2">{isHindi ? 'सदस्यता इतिहास' : 'Membership history'}</h4>
          <div className="space-y-2">{memberships.map(item => (
            <div key={item.id} className="p-3 border border-slate-200 rounded-xl text-xs flex justify-between gap-3">
              <span>{item.plan_name} · {item.start_date} – {item.end_date}</span><strong>{item.status}</strong>
            </div>
          ))}</div>
        </div>
      )}
    </div>
  );
}
