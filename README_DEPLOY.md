# Deploy to GitHub Pages (Vite + React)

이 저장소는 GitHub Pages에 자동 배포되도록 설정되어 있어.
아래 단계만 그대로 따라 하면 돼. (브랜치 이름: `main` 기준)

## 1) 깃헙 리포지토리 만들기
1. GitHub에서 새 리포지토리 생성: **be-myself-get-mine**
2. 리포지토리 "Settings" → "Pages" → **Source: GitHub Actions**로 되어 있는지 확인

## 2) 로컬에서 초기 커밋 & 푸시
```bash
# 로컬로 내려받기
git clone https://github.com/<YOUR_USERNAME>/be-myself-get-mine.git
cd be-myself-get-mine

# (아래 파일들을 그대로 복사)
# be-myself-get-mine 폴더 내용 전체를 이 디렉토리로 복사

# 최초 커밋
git add .
git commit -m "init: vite app with GH Pages workflow"
git push -u origin main
```

> 로컬에 git이 없다면 GitHub의 **Upload files** 버튼으로 웹에서 파일 업로드해도 됨.

## 3) 자동 배포 확인
- 푸시 후 **Actions** 탭에서 `Deploy Vite app to GitHub Pages` 워크플로우 실행 확인
- 완료되면 **Settings → Pages** 또는 **Actions 로그 끝부분**에 배포 URL 표시됨  
  URL 형식: `https://<YOUR_USERNAME>.github.io/be-myself-get-mine/`

## 4) 라우팅/새로고침 문제
SPA 새로고침 404 문제 방지를 위해 빌드 산출물에 `404.html`이 자동으로 포함되도록 설정해 두었어.

## 5) 사용자/조직 페이지에 배포할 경우
리포지토리 이름이 `<YOUR_USERNAME>.github.io` 라면 Vite `base`는 `'/'`여야 함.
이 경우 `vite.config.js`에서
```js
export default defineConfig({
  base: '/be-myself-get-mine/', // <-- 이 줄을
})
```
를
```js
export default defineConfig({
  base: '/', // <-- 이렇게 변경
})
```
하고 커밋/푸시하면 됨.