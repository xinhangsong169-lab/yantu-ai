export function Waiting({ text, done = [] }: { text: string; done?: string[] }) {
  return (
    <div className="waiting" role="status">
      <span className="waiting-dots" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      <div className="waiting-copy">
        {done.map((item) => (
          <p className="waiting-done" key={item}>
            {item}
          </p>
        ))}
        <p>{text}</p>
      </div>
    </div>
  );
}
