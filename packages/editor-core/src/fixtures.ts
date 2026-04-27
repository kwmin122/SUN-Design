export const BASIC_LANDING_FIXTURE_NAME = "basic-landing.html";

const PRODUCT_PREVIEW_SVG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='880' height='560' viewBox='0 0 880 560'%3E%3Crect width='880' height='560' rx='42' fill='%23fffaf0'/%3E%3Crect x='42' y='42' width='796' height='476' rx='34' fill='%23ffffff' stroke='%23171717' stroke-width='8'/%3E%3Crect x='92' y='112' width='322' height='34' rx='17' fill='%23171717'/%3E%3Crect x='92' y='174' width='420' height='22' rx='11' fill='%23667085'/%3E%3Crect x='92' y='250' width='326' height='132' rx='22' fill='%23eaf2ff' stroke='%231f6feb' stroke-width='6' stroke-dasharray='16 10'/%3E%3Crect x='548' y='118' width='198' height='160' rx='22' fill='%232f9f8f' stroke='%23171717' stroke-width='7'/%3E%3Cpath d='M548 278 746 118v160H548Z' fill='%23f5c84b'/%3E%3Cpath d='M632 278h114v-96L632 278Z' fill='%23ef5a3c'/%3E%3Ccircle cx='608' cy='174' r='30' fill='%23fffaf0'/%3E%3Crect x='536' y='336' width='238' height='120' rx='24' fill='%23f7f1e4' stroke='%23171717' stroke-width='7'/%3E%3Crect x='574' y='372' width='154' height='17' rx='9' fill='%23171717'/%3E%3Crect x='574' y='408' width='122' height='17' rx='9' fill='%232f9f8f'/%3E%3Crect x='574' y='444' width='86' height='17' rx='9' fill='%23ef5a3c'/%3E%3C/svg%3E";

export const BASIC_LANDING_FIXTURE_HTML = String.raw`<main
  class="landing"
  style="min-height: 100vh; background: #f3efe6; color: #171717; font-family: Inter, Pretendard, Apple SD Gothic Neo, Noto Sans KR, system-ui, sans-serif; padding: clamp(18px, 5vw, 42px); line-height: 1.55; overflow-x: hidden;"
>
  <section
    class="hero"
    style="display: flex; flex-wrap: wrap; align-items: center; gap: clamp(24px, 5vw, 44px); min-height: 520px; background: #fffdf7; border: 4px solid #171717; border-radius: 28px; padding: clamp(28px, 7vw, 54px); box-shadow: 18px 20px 0 rgba(23, 23, 23, 0.12); overflow: hidden;"
  >
    <div style="flex: 1 1 360px; min-width: min(100%, 280px);">
      <p class="eyebrow" style="margin: 0 0 18px; color: #2f9f8f; font-size: 15px; font-weight: 900; letter-spacing: 0;">K-Design Studio</p>
      <h1 style="margin: 0; max-width: 760px; font-size: clamp(30px, 9vw, 58px); line-height: 1.08; letter-spacing: 0; word-break: keep-all; overflow-wrap: anywhere;">AI 디자인을 바로 편집 가능한 결과물로</h1>
      <p style="margin: 26px 0 0; max-width: 720px; color: #3f4654; font-size: clamp(17px, 4.5vw, 23px); word-break: keep-all; overflow-wrap: anywhere;">한국어 문맥과 실제 제품 화면을 바탕으로 더 빠르게 다듬는 HTML 디자인 작업대입니다.</p>
      <div style="display: flex; flex-wrap: wrap; gap: 14px; margin-top: 34px;">
        <a href="https://example.com/signup" class="cta" target="_blank" style="flex: 1 1 150px; max-width: 220px; display: inline-flex; align-items: center; justify-content: center; min-height: 52px; padding: 0 24px; border: 3px solid #171717; border-radius: 14px; background: #171717; color: #ffffff; font-size: 18px; font-weight: 850; text-decoration: none; box-shadow: 7px 7px 0 rgba(23, 23, 23, 0.16); white-space: nowrap;">시작하기</a>
        <button onclick="alert('blocked')" style="flex: 1 1 150px; max-width: 220px; min-height: 52px; padding: 0 20px; border: 3px solid #171717; border-radius: 14px; background: #f5c84b; color: #171717; font-size: 18px; font-weight: 850; box-shadow: 7px 7px 0 rgba(23, 23, 23, 0.16); white-space: nowrap;">차단 테스트</button>
      </div>
    </div>
    <section class="product" style="flex: 1 1 260px; min-width: min(100%, 240px); width: min(100%, 360px); display: flex; flex-direction: column; gap: 18px;">
      <img src="${PRODUCT_PREVIEW_SVG}" alt="제품 미리보기" style="display: block; width: 100%; height: auto; border: 4px solid #171717; border-radius: 26px; background: #ffffff; box-shadow: 14px 16px 0 rgba(23, 23, 23, 0.13);">
      <div style="display: flex; gap: 12px;">
        <span style="display: inline-flex; align-items: center; min-height: 36px; padding: 0 14px; border: 2px solid #171717; border-radius: 999px; background: #2f9f8f; color: #ffffff; font-size: 14px; font-weight: 850;">Sandboxed</span>
        <span style="display: inline-flex; align-items: center; min-height: 36px; padding: 0 14px; border: 2px solid #171717; border-radius: 999px; background: #fffaf0; color: #171717; font-size: 14px; font-weight: 850;">Stable IDs</span>
      </div>
    </section>
    <section
      class="feature-grid"
      style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18px; margin-top: 26px;"
    >
      <article style="min-height: 150px; border: 3px solid #171717; border-radius: 22px; background: #ffffff; padding: 22px; box-shadow: 10px 10px 0 rgba(23, 23, 23, 0.08);">
        <p style="margin: 0 0 10px; color: #2f9f8f; font-size: 14px; font-weight: 900;">01</p>
        <h2 style="margin: 0; font-size: 23px; line-height: 1.22; word-break: keep-all;">검증 가능한 HTML</h2>
        <p style="margin: 12px 0 0; color: #56606c; font-size: 16px; word-break: keep-all;">실행 가능한 결과물을 안전한 경계 안에서 바로 확인합니다.</p>
      </article>
      <article style="min-height: 150px; border: 3px solid #171717; border-radius: 22px; background: #fff8df; padding: 22px; box-shadow: 10px 10px 0 rgba(23, 23, 23, 0.08);">
        <p style="margin: 0 0 10px; color: #2f9f8f; font-size: 14px; font-weight: 900;">02</p>
        <h2 style="margin: 0; font-size: 23px; line-height: 1.22; word-break: keep-all;">편집 가능한 구조</h2>
        <p style="margin: 12px 0 0; color: #56606c; font-size: 16px; word-break: keep-all;">텍스트, 이미지, 버튼, 블록을 안정적인 ID로 추적합니다.</p>
      </article>
      <article style="min-height: 150px; border: 3px solid #171717; border-radius: 22px; background: #eaf6f3; padding: 22px; box-shadow: 10px 10px 0 rgba(23, 23, 23, 0.08);">
        <p style="margin: 0 0 10px; color: #2f9f8f; font-size: 14px; font-weight: 900;">03</p>
        <h2 style="margin: 0; font-size: 23px; line-height: 1.22; word-break: keep-all;">한국어 디자인 감각</h2>
        <p style="margin: 12px 0 0; color: #56606c; font-size: 16px; word-break: keep-all;">문장 길이, 행간, 여백을 한국어 제품 화면에 맞춥니다.</p>
      </article>
    </section>
  </section>
  <form action="https://example.com/leak">
    <input name="email" value="blocked@example.com">
  </form>
  <script>alert("blocked")</script>
</main>`;
