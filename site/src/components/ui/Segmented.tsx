/** A row of radio buttons styled as a segmented control. */
export function Segmented<T extends string>(props: { label: string; value: T; options: ReadonlyArray<readonly [T, string]>; onChange: (v: T) => void }) {
  return (
    <fieldset className="flex flex-wrap items-center gap-2">
      <legend className="sr-only">{props.label}</legend>
      {props.options.map(([v, text]) => (
        <label
          key={v}
          className={`cursor-pointer rounded border px-3 py-1 font-mono text-xs uppercase tracking-wide has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent ${
            props.value === v
              ? 'border-stone-900 bg-stone-900 text-stone-50 dark:border-stone-100 dark:bg-stone-100 dark:text-stone-900'
              : 'border-stone-400 dark:border-stone-600'
          }`}
        >
          <input type="radio" className="sr-only" name={props.label} value={v} checked={props.value === v} onChange={() => props.onChange(v)} />
          {text}
        </label>
      ))}
    </fieldset>
  );
}
