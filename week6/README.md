# 6주차 · Flask 서버 계산 실습

Python 3.12의 `wp6` 환경에서 실행합니다. 이미지 처리와 TTS 모두 HTML·CSS·JavaScript 화면을 Flask가 제공하며, 계산은 서버의 Python에서 실행합니다.

## 실습 1 · 이미지 실험실

JPEG/PNG 사진과 처리 방법을 `FormData`로 보내면 Flask와 OpenCV가 흑백·Gaussian Blur·윤곽선 결과를 PNG로 반환합니다. fetch 방식은 같은 화면에 원본·결과와 시간을 표시하고, 일반 form 방식은 응답 PNG를 현재 문서로 엽니다.

```sh
python -m pip install -r requirements.txt
python -m flask --app app run --debug --port 5000
```

브라우저에서 <http://127.0.0.1:5000>을 엽니다. `static/sample.png` 또는 JPEG/PNG 사진을 사용할 수 있으며 파일은 5 MiB, 이미지는 800만 픽셀 이하여야 합니다.

### Render 설정

- Root Directory: `week6`
- Build Command: `pip install -r requirements.txt`
- Start Command: `gunicorn app:app --bind 0.0.0.0:$PORT --workers 1 --threads 2 --timeout 120`
- Environment Variable: `PYTHON_VERSION=3.12.12`
- Health Check Path: `/health`

업로드 사진과 결과는 메모리에서 처리하고 서버에 영구 저장하지 않습니다. 이미지 앱은 Render에 배포하지만 TTS 앱은 배포하지 않습니다.

## 실습 2 · 여행 영어 음성 카드

해외여행에서 바로 쓸 영어 문장을 연습하는 사용 상황을 정했습니다. 길 찾기·맛집 추천·숙소 체크인 예문을 선택하거나 직접 작성하면 Flask 서버의 Piper 모델이 새 WAV를 생성하고, 브라우저가 `Blob`과 `AudioContext`로 음성 길이와 파형을 분석합니다. 상황별 예문 버튼과 읽기 속도 선택을 나만의 요소로 추가했습니다.

```sh
python -m pip install -r requirements-tts.txt
python -m piper.download_voices en_US-lessac-low --download-dir models
python -m flask --app tts_app run --debug --port 5000
```

브라우저에서 <http://127.0.0.1:5000/tts>를 엽니다. 모델은 영어용 `en_US-lessac-low`이며, 모델 파일은 저장소에 올리지 않습니다.

필수 결과인 Canvas 파형, 서버 생성 시간, 음성 길이, WAV 크기를 표시합니다. 속도 선택, 음성 재생, WAV 다운로드도 함께 제공합니다.

## 배포 전 확인

- 세 이미지 처리 방법과 Blur 커널 3·15·51을 확인합니다.
- 파일 없음, 잘못된 처리 방법·커널, 지원하지 않는 파일, 크기 초과 응답을 확인합니다.
- 서로 다른 영어 문장 두 개의 파형과 길이를 비교합니다.
- 빈 문장, 300자 초과, 비영문 문장, 모델 없음 응답을 확인합니다.
- 실제 측정값과 로컬 이미지·TTS 결과 화면은 최상위 README에 기록했습니다. Render URL과 공개 URL의 휴대전화 확인은 배포 후 추가합니다.

## 결과 화면

- [390px 이미지 처리 결과](screenshots/image-result-mobile.png)
- [Piper TTS 파형과 생성 정보](screenshots/tts-result.png)

## 사용 기술과 출처

- Flask, OpenCV, NumPy, Pillow
- [Piper](https://github.com/OHF-Voice/piper1-gpl)
- [en_US-lessac-low 모델 카드](https://huggingface.co/rhasspy/piper-voices/blob/main/en/en_US/lessac/low/MODEL_CARD)
