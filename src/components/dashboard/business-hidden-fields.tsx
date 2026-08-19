export function BusinessHiddenFields({
  values,
  omit = [],
}: {
  values: Record<string, string>;
  omit?: string[];
}) {
  const skip = new Set(omit);
  return (
    <>
      {Object.entries(values).map(([name, value]) =>
        skip.has(name) ? null : (
          <input key={name} type="hidden" name={name} value={value} />
        )
      )}
    </>
  );
}
