/* ✓ Verified Business chip — shown when a partner supplied CAC
 * registration (BN/RC number) on their application. */
export default function VerifiedBadge({
  cacType,
  cacNumber,
}: {
  cacType?: string;
  cacNumber?: string;
}) {
  if (!cacNumber) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[#20a957]/15 px-2.5 py-0.5 text-xs font-bold text-[#48d87c]">
      ✓ Verified Business
      <span className="font-medium opacity-70">
        {cacType} {cacNumber}
      </span>
    </span>
  );
}
