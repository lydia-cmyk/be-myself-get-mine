# Be myself, Get mine

프리랜서 프로젝트/작업 관리 웹앱 (React + Vite + Tailwind).

## 로컬 실행

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:5173` 열기.

## 빌드

```bash
npm run build
npm run preview
```

## 배포 옵션

- **Vercel**: 새 프로젝트 → GitHub 리포 연결 → Framework: Vite, Build: `npm run build`, Output: `dist`.  또는 CLI: `npm i -g vercel && vercel`

- **Netlify**: 새 사이트 연결 → Repo 선택 → Build command: `npm run build`, Publish directory: `dist`.  또는 CLI: `npm i -g netlify-cli && netlify deploy`

- **GitHub Pages**: 리포 생성 후 푸시 → `gh-pages` 브랜치에 `dist` 업로드 또는 Actions 사용.
