#!/bin/bash

# 프로젝트 절대 경로 구하기
PROJECT_DIR="$(pwd)"
APP_NAME="SRT Translator.app"

echo "🚀 Creating Mac App: $APP_NAME..."

# AppleScript 내용 작성
# 터미널을 열어 npm run dev를 실행하고, 브라우저로 띄우는 스크립트
cat <<EOF > build_app.applescript
tell application "Terminal"
    do script "cd '$PROJECT_DIR' && npm run dev"
end tell

delay 3 -- 서버가 켜질 때까지 3초 대기

tell application "System Events"
    open location "http://localhost:3000"
end tell
EOF

# osacompile 명령어로 AppleScript를 Mac 앱(.app)으로 컴파일
osacompile -o "$APP_NAME" build_app.applescript

# 임시 스크립트 파일 삭제
rm build_app.applescript

echo "✅ App creation complete! You can find '$APP_NAME' in your project folder."
echo "💡 Tip: You can drag and drop this .app file to your Applications folder or Desktop!"
