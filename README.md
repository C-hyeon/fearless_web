# 피어리스 [한국디지털콘텐츠학회 추계종합학술대회]

## Function

1. Frontend: React / Backend: Node.js
> - **React**의 경우 .jsx 기반의 **Vite** 프론트엔드 개발 도구 사용(추후 **.tsx** 전환 예정)
>> - **React-Hook**의 **useState**, **useEffect**, **useRef**, **useContext** 활용 데이터 상태관리
>> - **React-Router**, **Axios** 활용 *Client - Client* Routing / *Client - Server* API 통신 설정
> - **Node.js**의 경우 **Express** 경량화 웹 개발 프레임워크 사용

2. UI/UX 디자인 설정
> - *CSS* 상위호환인 **SCSS(Sassy CSS)** 활용 웹 디자인 구성
> - **Framer-Motion** 활용 컴포넌트 별 애니메이션 추가
> - **React-Icons** 활용 웹 클라이언트 내 특정 아이콘 추가

3. Firebase 연동
> - **Cloud Firestore** 활용 데이터베이스 구축
> - **Authentication** 활용 사용자 인증 관리
> - **Cloud Storage** 활용 jpg, png 이미지 저장소 설정

4. 사용자 회원가입 및 로그인 시스템 *(Local / Google)*
> - **JWT(Json Web Token)** + **HTTP Cookie** 방식 활용 사용자 인증 시스템
> - **Google OAuth 2.0** 활용 *Google* 로그인 시스템
> - **Nodemailer** 활용 이메일 인증코드 발송 및 인증 시스템

5. 사용자 프로필 시스템
> - 사용자 정보 수정 및 회원탈퇴 시스템
> - **Multer** 활용 사용자 프로필 이미지 수정 및 기본 이미지 전환 시스템

6. 게임 자유게시판 시스템
> - 로그인 X : 게시글 목록 확인 및 상세보기 기능
> - 로그인 O : 게시글 목록 확인 및 상세보기, **게시글 추가, 본인 게시글 수정 및 삭제** 기능

7. Unity 게임 - 웹 통합 시스템
![게임-웹 아키텍처](https://github.com/C-hyeon/fearless_web/blob/main/Architecture.png)
> - 사용자 통합 인증 시스템 *(사용자 회원가입 및 로그인 시스템 참조)*
> - 통합 상점, 통합 우편함 시스템 *(게임, 웹 내 동시 사용)*
> - 게임 플레이타임에 따른 웹 내 실시간 차등 보상 시스템 *(중간자: Cloud Firestore)*
