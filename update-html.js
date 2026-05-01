const fs = require('fs');
const path = require('path');

const walk = (dir, done) => {
  let results = [];
  fs.readdir(dir, (err, list) => {
    if (err) return done(err);
    let pending = list.length;
    if (!pending) return done(null, results);
    list.forEach((file) => {
      file = path.resolve(dir, file);
      fs.stat(file, (err, stat) => {
        if (stat && stat.isDirectory()) {
          walk(file, (err, res) => {
            results = results.concat(res);
            if (!--pending) done(null, results);
          });
        } else {
          results.push(file);
          if (!--pending) done(null, results);
        }
      });
    });
  });
};

const frontendDir = path.join(__dirname, 'frontend');

walk(frontendDir, (err, files) => {
  if (err) throw err;
  
  files.filter(f => f.endsWith('.html')).forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    
    // Fix CSS path (Vite supports absolute paths from project root)
    content = content.replace(/href="css\/index\.css"/g, 'href="/css/index.css"');
    content = content.replace(/href="\.\.\/css\/index\.css"/g, 'href="/css/index.css"');
    content = content.replace(/href="\.\.\/\.\.\/css\/index\.css"/g, 'href="/css/index.css"');

    // Fix internal links to absolute paths from Vite root
    content = content.replace(/href="index\.html"/g, 'href="/index.html"');
    content = content.replace(/href="landing\.html"/g, 'href="/index.html"'); // landing is now index
    content = content.replace(/href="onboarding-login\.html"/g, 'href="/pages/auth/login.html"');
    content = content.replace(/href="desktop-dashboard\.html"/g, 'href="/pages/desktop/dashboard.html"');
    content = content.replace(/href="financial-dashboard\.html"/g, 'href="/pages/mobile/dashboard.html"');
    content = content.replace(/href="desktop-add-transaction\.html"/g, 'href="/pages/desktop/add-transaction.html"');
    content = content.replace(/href="add-transaction\.html"/g, 'href="/pages/mobile/add-transaction.html"');
    content = content.replace(/href="desktop-analysis-insights\.html"/g, 'href="/pages/desktop/insights.html"');
    content = content.replace(/href="analysis-insights\.html"/g, 'href="/pages/mobile/insights.html"');
    content = content.replace(/href="design-system\.html"/g, 'href="/pages/docs/design-system.html"');
    content = content.replace(/href="fintrack-prd\.html"/g, 'href="/pages/docs/prd.html"');

    // Add script tag before </body> if not present
    if (!content.includes('src="/src/js/app.js"')) {
      content = content.replace('</body>', '  <script type="module" src="/src/js/app.js"></script>\n  </body>');
    }

    fs.writeFileSync(file, content);
  });
  console.log('HTML files updated successfully.');
});
