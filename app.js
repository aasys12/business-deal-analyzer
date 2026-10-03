const $ = (id) => document.getElementById(id);
const money = (n) => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(Number.isFinite(n)?n:0);
const pct = (n) => Number.isFinite(n) ? (n*100).toFixed(1)+'%' : '—';
const mult = (n) => Number.isFinite(n) ? n.toFixed(2)+'x' : '—';

function num(id){ return parseFloat($(id).value) || 0; }

function annualDebtService(principal, annualRatePct, years){
  if(principal <= 0 || years <= 0) return 0;
  const r = annualRatePct / 100 / 12;
  const n = years * 12;
  if(r === 0) return principal / years;
  const monthly = principal * (r * Math.pow(1+r,n)) / (Math.pow(1+r,n)-1);
  return monthly * 12;
}

function analyze(){
  const asking = num('askingPrice');
  const revenue = num('revenue');
  const sde = num('sde');
  const ebitda = num('ebitda');
  const manager = num('managerSalary');
  const capex = num('capex');
  const otherAdj = num('otherAdj');
  const downPct = num('downPct')/100;
  const rate = num('interestRate');
  const years = num('termYears');
  const marketSde = num('marketSdeMultiple');
  const marketRev = num('marketRevenueMultiple');
  const confidence = num('compConfidence')/100;

  const adjusted = Math.max(0, sde - manager - capex - otherAdj);
  const down = asking * downPct;
  const loan = Math.max(0, asking - down);
  const debt = annualDebtService(loan, rate, years);
  const cashAfterDebt = adjusted - debt;
  const dscr = debt > 0 ? adjusted/debt : Infinity;
  const coc = down > 0 ? cashAfterDebt/down : 0;
  const payback = cashAfterDebt > 0 ? down/cashAfterDebt : Infinity;
  const priceSde = sde > 0 ? asking/sde : Infinity;
  const sdeMargin = revenue > 0 ? sde/revenue : 0;

  const sdeValue = sde * marketSde;
  const revValue = revenue * marketRev;
  const weightedFair = (sdeValue*0.7 + revValue*0.3);
  const confidencePenalty = 1 - Math.max(0,Math.min(1,confidence))*0.05;
  const fairMid = weightedFair * confidencePenalty;
  const fairLow = fairMid*0.9;
  const fairHigh = fairMid*1.1;

  let score = 50;
  if(dscr >= 1.5) score += 18; else if(dscr >= 1.25) score += 10; else if(dscr < 1.1) score -= 20;
  if(coc >= .25) score += 15; else if(coc >= .15) score += 8; else if(coc < .08) score -= 12;
  if(priceSde <= marketSde) score += 10; else if(priceSde > marketSde*1.2) score -= 12;
  if(sdeMargin >= .18) score += 7; else if(sdeMargin < .1) score -= 8;
  if($('ownerDependency').checked) score -= 8;
  if($('shortLease').checked) score -= 7;
  if($('customerConcentration').checked) score -= 10;
  if($('booksWeak').checked) score -= 12;
  score = Math.max(0,Math.min(100,Math.round(score)));

  let label='REVIEW', klass='warn', title='Needs more diligence';
  if(dscr < 1.1 || cashAfterDebt <= 0 || $('booksWeak').checked && score < 45){
    label='PASS'; klass='bad'; title='Do not buy at the current structure';
  } else if(score >= 78 && asking <= fairHigh && dscr >= 1.4){
    label='BUY'; klass='good'; title='Attractive if diligence confirms the numbers';
  } else if(score >= 58){
    label='NEGOTIATE'; klass='warn'; title='Potentially good business, but not at this price or structure';
  } else {
    label='PASS'; klass='bad'; title='Risk-adjusted economics are weak';
  }

  const maxPriceByValue = fairHigh;
  const maxPriceByDebt = asking > 0 && dscr > 0 ? asking * Math.min(1, dscr/1.35) : fairHigh;
  const maxPrice = Math.max(0, Math.min(maxPriceByValue, maxPriceByDebt));
  const openingOffer = maxPrice*0.92;

  $('recommendationBadge').textContent = label;
  $('recommendationBadge').className = 'badge ' + klass;
  $('recommendationTitle').textContent = title;
  $('dealScore').textContent = score + '/100';
  $('fairValue').textContent = money(fairMid);
  $('maxPrice').textContent = money(maxPrice);
  $('openingOffer').textContent = money(openingOffer);
  $('priceSde').textContent = mult(priceSde);
  $('sdeMargin').textContent = pct(sdeMargin);
  $('adjustedCash').textContent = money(adjusted);
  $('debtService').textContent = money(debt);
  $('dscr').textContent = Number.isFinite(dscr) ? dscr.toFixed(2) : 'No debt';
  $('coc').textContent = pct(coc);
  $('payback').textContent = Number.isFinite(payback) ? payback.toFixed(1)+' yrs' : 'Not recovered';

  const premium = fairMid > 0 ? asking/fairMid - 1 : 0;
  $('valuationNarrative').innerHTML =
    '<strong>Comparable-value range:</strong> '+money(fairLow)+' – '+money(fairHigh)+
    '. The current asking price is <strong>'+pct(Math.abs(premium))+'</strong> '+
    (premium >= 0 ? 'above' : 'below')+
    ' the model midpoint. SDE-based value is '+money(sdeValue)+
    ' and revenue-based value is '+money(revValue)+'.';

  const propertyCash = num('propertyCash');
  const propertyCf = num('propertyCashFlow');
  const propertyApp = num('propertyAppreciation')/100;
  const propertyCoc = propertyCash > 0 ? propertyCf/propertyCash : 0;
  const businessCashRequired = down;
  const businessAnnual = cashAfterDebt;
  const businessCoc = businessCashRequired > 0 ? businessAnnual/businessCashRequired : 0;
  const propertyTotalSimple = propertyCoc + propertyApp;

  let better = 'Neither clearly dominates';
  if(businessCoc > propertyTotalSimple + .05 && dscr >= 1.25) better='Business currently offers the stronger cash return';
  else if(propertyTotalSimple > businessCoc + .03) better='Property currently offers the stronger risk-adjusted alternative';

  $('comparisonNarrative').innerHTML =
    '<strong>'+better+'.</strong> Business cash required: '+money(businessCashRequired)+
    ', annual post-debt cash flow: '+money(businessAnnual)+
    ', cash-on-cash: '+pct(businessCoc)+
    '. Property cash-on-cash: '+pct(propertyCoc)+
    ' plus entered appreciation assumption of '+pct(propertyApp)+'.';

  const stress = [
    {name:'Bull', rev:0.10, margin:0.02},
    {name:'Base', rev:0, margin:0},
    {name:'Stress', rev:-0.20, margin:-0.03},
    {name:'Severe', rev:-0.30, margin:-0.05}
  ];
  $('stressTable').innerHTML = stress.map(s=>{
    const baseMargin = revenue > 0 ? sde/revenue : 0;
    const stressedRevenue = revenue*(1+s.rev);
    const stressedSde = Math.max(0, stressedRevenue*Math.max(0,baseMargin+s.margin));
    const stressedAdjusted = Math.max(0, stressedSde-manager-capex-otherAdj);
    const stressedDscr = debt>0 ? stressedAdjusted/debt : Infinity;
    const stressedCash = stressedAdjusted-debt;
    const result = stressedDscr>=1.25 ? 'Healthy' : stressedDscr>=1 ? 'Thin' : 'Fails debt coverage';
    return '<tr><td>'+s.name+'</td><td>'+pct(s.rev)+'</td><td>'+money(stressedAdjusted)+'</td><td>'+
      (Number.isFinite(stressedDscr)?stressedDscr.toFixed(2):'No debt')+'</td><td>'+money(stressedCash)+'</td><td>'+result+'</td></tr>';
  }).join('');

  const positives=[];
  const concerns=[];
  if(dscr>=1.5) positives.push('Strong base-case debt coverage.');
  else if(dscr>=1.25) positives.push('Acceptable base-case debt coverage.');
  else concerns.push('Debt coverage is below a comfortable acquisition threshold.');
  if(coc>=.2) positives.push('Strong modeled cash-on-cash return.');
  else if(coc<.1) concerns.push('Cash-on-cash return is weak for an operating business.');
  if(priceSde<=marketSde) positives.push('Asking multiple is at or below the entered comparable SDE multiple.');
  else concerns.push('Asking multiple is above the entered comparable SDE multiple.');
  if(sdeMargin>=.15) positives.push('Reported SDE margin is relatively healthy.');
  else concerns.push('Reported SDE margin is modest.');
  if($('ownerDependency').checked) concerns.push('Business may require replacing owner labor or expertise.');
  if($('shortLease').checked) concerns.push('Short lease term creates renewal/rent risk.');
  if($('customerConcentration').checked) concerns.push('Customer concentration can materially impair value.');
  if($('booksWeak').checked) concerns.push('Weak financial verification is a major diligence red flag.');
  if(!positives.length) positives.push('No major positives triggered by the current assumptions.');
  if(!concerns.length) concerns.push('No major risk flags were selected, but diligence is still required.');

  $('positives').innerHTML = positives.map(x=>'<li>'+x+'</li>').join('');
  $('concerns').innerHTML = concerns.map(x=>'<li>'+x+'</li>').join('');

  let summary = 'Base-case DSCR is '+(Number.isFinite(dscr)?dscr.toFixed(2):'not applicable')+
    ', adjusted owner cash flow is '+money(adjusted)+', and modeled cash after debt is '+money(cashAfterDebt)+'. ';
  if(label==='BUY') summary += 'The price and financing are within the model’s acceptable range.';
  if(label==='NEGOTIATE') summary += 'The business may work, but the price or structure should improve.';
  if(label==='PASS') summary += 'The downside or debt coverage is not strong enough at the current terms.';
  $('recommendationSummary').textContent = summary;
}

$('dealForm').addEventListener('submit',e=>{e.preventDefault();analyze();});
$('loadExampleBtn').addEventListener('click',()=>{
  $('businessName').value='Example Service Business';
  $('location').value='Dallas-Fort Worth, TX';
  $('askingPrice').value=650000;
  $('revenue').value=1200000;
  $('sde').value=210000;
  $('ebitda').value=150000;
  $('rent').value=72000;
  $('inventory').value=60000;
  $('managerSalary').value=65000;
  $('capex').value=12000;
  $('otherAdj').value=8000;
  $('downPct').value=20;
  $('interestRate').value=10.5;
  $('termYears').value=10;
  $('marketSdeMultiple').value=2.65;
  $('marketRevenueMultiple').value=.48;
  $('compConfidence').value=70;
  $('propertyCash').value=150000;
  $('propertyCashFlow').value=11400;
  $('propertyAppreciation').value=3;
  $('ownerDependency').checked=true;
  $('shortLease').checked=true;
  $('customerConcentration').checked=false;
  $('booksWeak').checked=false;
  analyze();
});

analyze();