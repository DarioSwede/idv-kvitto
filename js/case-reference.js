// Older backends can still serve the admin UI during staged publication.
export function caseReference(submission) {
  if (/^\d{4}-\d{4,}$/.test(submission?.caseNumber || '')) return submission.caseNumber;
  const id = String(submission?.id || '');
  return id.length > 18 ? `${id.slice(0, 8)}...${id.slice(-4)}` : id;
}
