import {appendSummaryRow} from './review-summary.js';
import {maskAccountNumber} from './bank-account.js';

export function calculateSubmissionTotals(photos=[],travelAmount=0){
  const receiptTotal=photos.reduce((sum,photo)=>sum+(Number(photo.amount)||0),0);
  return{receiptTotal,grandTotal:receiptTotal+(Number(travelAmount)||0),hasReceiptAmounts:photos.some(photo=>photo.amount)};
}

export function formatSek(value){
  return Number(value||0).toLocaleString('sv-SE',{minimumFractionDigits:2,maximumFractionDigits:2})+' kr';
}

export function getSubmissionReference(){
  if(globalThis.__idvSubmissionCaseId)return globalThis.__idvSubmissionCaseId;
  const date=new Date().toISOString().slice(0,10).replaceAll('-','');
  const random=Math.random().toString(36).slice(2,6).toUpperCase();
  globalThis.__idvSubmissionCaseId=`IDV-${date}-${random}`;
  return globalThis.__idvSubmissionCaseId;
}

export function renderSubmissionSummary({container,documentRef=document,submissionId=getSubmissionReference(),name='',email='',eventTag='',photos=[],travel={},bank={},submissionMode='receipts'}={}){
  if(!container)return null;
  container.replaceChildren();
  container.classList.add('summary-sheet');
  const totals=calculateSubmissionTotals(photos,travel.amount);
  appendSummaryRow(container,documentRef,'Ärende-ID',submissionId||getSubmissionReference(),'case-id');
  appendSummaryRow(container,documentRef,'Namn',name||'—');
  appendSummaryRow(container,documentRef,'E-post',email||'—');
  appendSummaryRow(container,documentRef,'Tillfälle',eventTag||'—');
  if(bank?.valid)appendSummaryRow(container,documentRef,'Konto för utbetalning',`Clearing ${bank.clearingNumber} · ${maskAccountNumber(bank.accountNumber)}`,'bank-summary');
  appendSummaryRow(container,documentRef,'Summa kvitton',totals.hasReceiptAmounts?formatSek(totals.receiptTotal):'—','receipt-total');
  if(travel.enabled){
    appendSummaryRow(container,documentRef,'Resa',travel.description||'—','travel-summary');
    appendSummaryRow(container,documentRef,'Kilometer och beräkning',travel.calculation||'—','travel-summary');
    appendSummaryRow(container,documentRef,'Godkänd reseersättning',formatSek(travel.amount),'travel-summary');
  }
  const totalLabel=submissionMode==='receipts'?'Totalt kvitton':'Totalt inklusive reseersättning';
  appendSummaryRow(container,documentRef,totalLabel,formatSek(totals.grandTotal),'grand-total');
  return totals;
}

export function updateSubmissionTotals({container,photos=[],travelAmount=0}={}){
  if(!container)return null;
  const totals=calculateSubmissionTotals(photos,travelAmount);
  const receiptValue=container.querySelector('.receipt-total b');
  const grandValue=container.querySelector('.grand-total b');
  if(receiptValue)receiptValue.textContent=totals.hasReceiptAmounts?formatSek(totals.receiptTotal):'—';
  if(grandValue)grandValue.textContent=formatSek(totals.grandTotal);
  return totals;
}
