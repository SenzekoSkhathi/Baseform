const fs = require('fs');
const path = require('path');

function addSuspenseImport(content) {
  if (content.includes('import { Suspense } from "react"')) return content;
  if (content.includes('from "react"')) {
    return content.replace(/import\s+\{([^}]+)\}\s+from\s+"react";/, (match, p1) => {
      if (p1.includes('Suspense')) return match;
      return `import { Suspense, ${p1} } from "react";`;
    });
  }
  return `import { Suspense } from "react";\n` + content;
}

const wrapperFiles = [
  { file: 'src/app/(marketing)/plans/page.tsx', comp: 'PlansClient' },
  { file: 'src/app/app/basebot/preview/page.tsx', comp: 'BaseBotPreviewClient' },
  { file: 'src/app/app/profile/page.tsx', comp: 'ProfileClient' },
  { file: 'src/app/payment/success/page.tsx', comp: 'SuccessClient' }
];

for (const {file, comp} of wrapperFiles) {
  const p = path.resolve(file);
  let content = fs.readFileSync(p, 'utf8');
  content = addSuspenseImport(content);
  
  const regex = new RegExp(`return\\s*\\(?\\s*(<${comp}[\\s\\S]*?\\/>)\\s*\\)?;`);
  if (!regex.test(content)) {
    console.log(`Failed to match regex in ${file}`);
  } else {
    content = content.replace(regex, `return (\n    <Suspense fallback={<div className="flex justify-center p-8"><div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" /></div>}>\n      $1\n    </Suspense>\n  );`);
    fs.writeFileSync(p, content);
    console.log(`Updated ${file}`);
  }
}

const clientFiles = [
  { file: 'src/app/(auth)/verify-email/page.tsx', oldFunc: 'VerifyEmailPage', newFunc: 'VerifyEmailContent' },
  { file: 'src/app/(marketing)/waitlist/page.tsx', oldFunc: 'WaitlistPage', newFunc: 'WaitlistContent' },
  { file: 'src/app/payment/page.tsx', oldFunc: 'PaymentPage', newFunc: 'PaymentContent' },
  { file: 'src/app/reveal/page.tsx', oldFunc: 'RevealPage', newFunc: 'RevealContent' },
  { file: 'src/app/app/vault/editor/page.tsx', oldFunc: 'VaultEditorPage', newFunc: 'VaultEditorContent' }
];

for (const {file, oldFunc, newFunc} of clientFiles) {
  const p = path.resolve(file);
  let content = fs.readFileSync(p, 'utf8');
  content = addSuspenseImport(content);
  
  content = content.replace(`export default function ${oldFunc}() {`, `function ${newFunc}() {`);
  
  const wrapper = `\n\nexport default function ${oldFunc}() {\n  return (\n    <Suspense fallback={<div className="min-h-screen w-full flex items-center justify-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" /></div>}>\n      <${newFunc} />\n    </Suspense>\n  );\n}\n`;
  
  content = content + wrapper;
  
  fs.writeFileSync(p, content);
  console.log(`Updated ${file}`);
}
