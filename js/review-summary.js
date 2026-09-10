export function appendSummaryRow(summary,documentRef,labelText,valueText,className='summary-row'){
  if(!summary||!documentRef)return null;
  const row=documentRef.createElement('div');
  row.className=`row ${className}`;
  const label=documentRef.createElement('span');
  label.textContent=labelText;
  const value=documentRef.createElement('b');
  value.textContent=valueText;
  row.append(label,value);
  summary.append(row);
  return row;
}
