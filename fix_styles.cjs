const fs = require('fs');

const classRegex = /(sm|md|lg):([a-zA-Z0-9-\[\]]+)/g;

function generateStyles(file) {
  const code = fs.readFileSync(file, 'utf8');
  let match;
  const classes = new Set();
  while ((match = classRegex.exec(code)) !== null) {
    classes.add(match[0]);
  }

  const definitions = {
    'sm:block': 'display: block',
    'lg:block': 'display: block',
    'lg:hidden': 'display: none',
    'sm:hidden': 'display: none',
    'lg:flex': 'display: flex',
    'sm:flex': 'display: flex',
    'md:flex-row': 'flex-direction: row',
    'sm:flex-row': 'flex-direction: row',
    'sm:flex-col': 'flex-direction: column',
    'sm:flex-none': 'flex: none',
    'sm:grid': 'display: grid',
    'sm:inline': 'display: inline',
    'sm:items-center': 'align-items: center',
    'sm:items-start': 'align-items: flex-start',
    'sm:items-end': 'align-items: flex-end',
    'sm:justify-start': 'justify-content: flex-start',
    'sm:justify-between': 'justify-content: space-between',
    'sm:self-auto': 'align-self: auto',
    'sm:text-base': 'font-size: 1rem; line-height: 1.5',
    'sm:text-sm': 'font-size: 0.875rem; line-height: 1.25',
    'sm:text-xs': 'font-size: 0.75rem; line-height: 1rem',
    'sm:text-lg': 'font-size: 1.125rem; line-height: 1.75',
    'sm:text-xl': 'font-size: 1.25rem; line-height: 1.75',
    'sm:text-2xl': 'font-size: 1.5rem; line-height: 2',
    'sm:text-3xl': 'font-size: 1.875rem; line-height: 2.25',
    'sm:text-4xl': 'font-size: 2.25rem; line-height: 2.5rem',
    'md:text-5xl': 'font-size: 3rem; line-height: 1',
    'sm:text-[10px]': 'font-size: 10px',
    'sm:text-[11px]': 'font-size: 11px',
    'sm:text-left': 'text-align: left',
    'sm:text-slate-700': 'color: #334155',
    'sm:leading-normal': 'line-height: 1.5',
    'sm:rounded-lg': 'border-radius: 0.5rem',
    'sm:border-b-0': 'border-bottom-width: 0px',
    'sm:border-r': 'border-right-width: 1px',
    'sm:overflow-visible': 'overflow: visible',
    'sm:align-middle': 'vertical-align: middle',
    'sm:grid-cols-2': 'grid-template-columns: repeat(2, minmax(0, 1fr))',
    'sm:grid-cols-3': 'grid-template-columns: repeat(3, minmax(0, 1fr))',
    'sm:grid-cols-12': 'grid-template-columns: repeat(12, minmax(0, 1fr))',
    'lg:grid-cols-12': 'grid-template-columns: repeat(12, minmax(0, 1fr))',
    'sm:col-span-4': 'grid-column: span 4 / span 4',
    'sm:col-span-8': 'grid-column: span 8 / span 8',
    'lg:col-span-3': 'grid-column: span 3 / span 3',
    'lg:col-span-4': 'grid-column: span 4 / span 4',
    'lg:col-span-8': 'grid-column: span 8 / span 8',
    'lg:col-span-9': 'grid-column: span 9 / span 9',
    'sm:w-3': 'width: 0.75rem',
    'sm:w-48': 'width: 12rem',
    'sm:w-auto': 'width: auto',
    'sm:max-w-[200px]': 'max-width: 200px',
    'sm:max-w-[120px]': 'max-width: 120px',
    'sm:min-w-0': 'min-width: 0px',
    'sm:h-3': 'height: 0.75rem',
    'sm:gap-1': 'gap: 0.25rem',
    'sm:gap-3': 'gap: 0.75rem',
    'sm:gap-4': 'gap: 1rem',
    'sm:gap-6': 'gap: 1.5rem',
  };

  const paddingsAndMargins = {
    'p-': ['padding'],
    'px-': ['padding-left', 'padding-right'],
    'py-': ['padding-top', 'padding-bottom'],
    'm-': ['margin'],
    'mx-': ['margin-left', 'margin-right'],
    'my-': ['margin-top', 'margin-bottom'],
    'mt-': ['margin-top'],
    'mb-': ['margin-bottom'],
    'ml-': ['margin-left'],
    'mr-': ['margin-right']
  };

  const spacingMap = {
    '0': '0px', '1': '0.25rem', '1.5': '0.375rem', '2': '0.5rem', '2.5': '0.625rem', '3': '0.75rem',
    '4': '1rem', '5': '1.25rem', '6': '1.5rem', '8': '2rem', '10': '2.5rem', '12': '3rem', '16': '4rem'
  };

  const styles = [];
  Array.from(classes).sort().forEach(cls => {
    if (definitions[cls]) {
      const parts = definitions[cls].split(';').map(p => p.trim() + ' !important').join('; ');
      styles.push('.' + cls.replace(/\[/g, '\\\\[').replace(/\]/g, '\\\\]').replace(/:/g, '\\\\:') + ' { ' + parts + '; }');
    } else {
      const splitCls = cls.split(':');
      const tail = splitCls[1];
      for (const [prefix, cssProps] of Object.entries(paddingsAndMargins)) {
        if (tail.startsWith(prefix)) {
          const valStr = tail.slice(prefix.length);
          const val = spacingMap[valStr] || (valStr + 'px');
          const rules = cssProps.map(p => p + ': ' + val + ' !important').join('; ');
          styles.push('.' + cls.replace(/\[/g, '\\\\[').replace(/\]/g, '\\\\]').replace(/:/g, '\\\\:') + ' { ' + rules + '; }');
          break;
        }
      }
    }
  });

  return styles.join('\n      ');
}

['src/pages/ResultView.tsx', 'src/pages/Booklists.tsx', 'src/pages/ExamRoutines.tsx'].forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  const styleString = generateStyles(file);
  content = content.replace(/styleEl\.innerHTML = `[\s\S]*?`;/, 'styleEl.innerHTML = `\n      ' + styleString + '\n    `;');
  fs.writeFileSync(file, content);
});
