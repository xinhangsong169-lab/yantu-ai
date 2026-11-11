type IconName = 'desk' | 'book' | 'meeting' | 'research' | 'career' | 'calendar' | 'memory' | 'close' | 'send';

const PATHS: Record<IconName, string> = {
  desk: 'M4 8.5h16M6 8.5V18m12-9.5V18M4 18h16M8 12h8',
  book: 'M5 5.5h6.2A2.8 2.8 0 0 1 14 8.3V19a2.4 2.4 0 0 0-2.2-1.4H5V5.5Zm14 0h-6.2A2.8 2.8 0 0 0 10 8.3V19a2.4 2.4 0 0 1 2.2-1.4H19V5.5Z',
  meeting: 'M8 16.5v1.2a1.3 1.3 0 0 0 1.3 1.3h5.4a1.3 1.3 0 0 0 1.3-1.3V16.5M7 6.5h10v7.2a2.2 2.2 0 0 1-2.2 2.2H9.2A2.2 2.2 0 0 1 7 13.7V6.5Zm2.2 3h5.6M9.2 12h3.2',
  research: 'M9 5.5h6M12 5.5V8m-4.2 2.2a4.2 4.2 0 1 0 6.7 3.4L17.5 19',
  career: 'M4.5 8.5h15v9.2a1.3 1.3 0 0 1-1.3 1.3H5.8a1.3 1.3 0 0 1-1.3-1.3V8.5Zm4-2.2h7v2.2h-7V6.3Z',
  calendar: 'M6 6.5h12v12H6v-12Zm0 4h12M9 4.8v3M15 4.8v3',
  memory: 'M6 7.5h12v10H6v-10Zm3 2.5h6M9 12.5h4',
  close: 'M7 7l10 10M17 7 7 17',
  send: 'M5 12h12M13 7l5 5-5 5'
};

export function Icon({ name }: { name: IconName }) {
  return (
    <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d={PATHS[name]} />
    </svg>
  );
}
