from pathlib import Path
import zipfile, os

base = Path("/mnt/data/esna3_tareeqak")
addon = r'''/* اصنع طريقك - إضافة مساحة المعلم
   ضع هذا الملف بجوار index.html ثم أضف:
   <script src="teacher-addon.js"></script>
   بعد app.js مباشرة في index.html.
*/
(() => {
  "use strict";
  const KEY = "esna3TeacherCourses";
  const $ = (s, r=document) => r.querySelector(s);
  const all = () => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; } };
  const save = items => localStorage.setItem(KEY, JSON.stringify(items));
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const toast = msg => {
    let el = $("#toast");
    if (!el) { el=document.createElement("div"); el.className="toast"; document.body.appendChild(el); }
    el.textContent=msg; el.classList.add("show"); setTimeout(()=>el.classList.remove("show"),2300);
  };

  const style = document.createElement("style");
  style.textContent = `
    .teacher-addon-page{max-width:1400px;margin:auto;padding:35px 4.2% 55px}
    .teacher-addon-grid{display:grid;grid-template-columns:minmax(0,1.6fr) minmax(220px,.8fr);gap:16px;align-items:start}
    .teacher-addon-form,.teacher-addon-info{background:var(--card,#fff);border:1px solid var(--line,#eceef5);border-radius:17px;padding:22px}
    .teacher-addon-form h2{font-size:16px;margin:0 0 5px}.teacher-addon-form p,.teacher-addon-info p{font-size:10px;color:var(--muted,#8990a8)}
    .teacher-addon-fields{display:grid;grid-template-columns:1fr 1fr;gap:0 13px}
    .teacher-addon-fields label{display:grid;gap:6px;margin:10px 0;font-size:10px;font-weight:800}
    .teacher-addon-fields input,.teacher-addon-fields select,.teacher-addon-fields textarea{width:100%;border:1px solid var(--line,#eceef5);border-radius:10px;padding:11px;background:var(--card,#fff);color:var(--ink,#202744);font:inherit;font-size:11px}
    .teacher-addon-fields .wide{grid-column:1/-1}
    .teacher-addon-form button{border:0;border-radius:10px;background:#6873ed;color:white;padding:11px 18px;font:inherit;font-size:11px;font-weight:800;cursor:pointer}
    .teacher-addon-info{background:linear-gradient(145deg,#eef0ff,#fafaff)}.teacher-addon-info strong{display:block;font-size:26px;color:#6873ed}
    .teacher-addon-list{display:grid;gap:9px;margin-top:14px}
    .teacher-addon-row{display:flex;align-items:center;gap:12px;padding:13px;background:var(--card,#fff);border:1px solid var(--line,#eceef5);border-radius:12px}
    .teacher-addon-row .copy{flex:1;min-width:0}.teacher-addon-row b,.teacher-addon-row small{display:block}.teacher-addon-row b{font-size:11px}.teacher-addon-row small{font-size:9px;color:var(--muted,#8990a8)}
    .teacher-addon-row button{border:0;background:#fff0f0;color:#c64e59;border-radius:8px;padding:7px 10px;font:inherit;font-size:9px;cursor:pointer}
    .teacher-addon-empty{padding:18px;text-align:center;border:1px dashed var(--line,#eceef5);border-radius:12px;color:var(--muted,#8990a8);font-size:11px}
    .teacher-addon-course{background:var(--card,#fff);border:1px solid var(--line,#eceef5);border-radius:14px;overflow:hidden}
    .teacher-addon-course .cover{height:85px;display:grid;place-items:center;font-size:34px;background:linear-gradient(135deg,#e8e8ff,#c9ceff)}
    .teacher-addon-course .body{padding:12px}.teacher-addon-course small{color:var(--muted,#8990a8);font-size:9px}.teacher-addon-course b{display:block;font-size:12px;margin:5px 0}
    .teacher-addon-course a{color:#6873ed;font-size:10px;text-decoration:none;font-weight:800}
    @media(max-width:800px){.teacher-addon-grid{grid-template-columns:1fr}.teacher-addon-fields{grid-template-columns:1fr}.teacher-addon-fields .wide{grid-column:auto}}
  `;
  document.head.appendChild(style);

  const nav = document.querySelector(".nav");
  const main = document.querySelector(".main");
  if (!nav || !main || $("#page-teacher-addon")) return;

  const navBtn = document.createElement("button");
  navBtn.className = "nav-link";
  navBtn.dataset.teacherAddon = "true";
  navBtn.innerHTML = "<span>＋</span> مساحة المعلم";
  nav.appendChild(navBtn);

  const page = document.createElement("section");
  page.id = "page-teacher-addon";
  page.className = "content hidden";
  page.innerHTML = `
    <div class="page-intro"><span class="eyebrow">للمعلمين وصنّاع المحتوى</span><h1>مساحة المعلم</h1><p>أضف كورساتك التعليمية لتظهر للطلاب على هذه النسخة من الموقع.</p></div>
    <div class="teacher-addon-grid">
      <form class="teacher-addon-form" id="teacherAddonForm">
        <h2>＋ إضافة كورس جديد</h2><p>املأ بيانات الكورس ثم اضغط إضافة.</p>
        <div class="teacher-addon-fields">
          <label>اسم الكورس *<input name="title" maxlength="70" required placeholder="مثال: شرح منهج الرياضيات"></label>
          <label>المادة *<input name="subject" maxlength="40" required placeholder="الرياضيات"></label>
          <label>المرحلة التعليمية *<select name="stage" required><option value="">اختر المرحلة</option><option>المرحلة الابتدائية</option><option>المرحلة الإعدادية</option><option>المرحلة الثانوية</option><option>التعليم الجامعي</option></select></label>
          <label>اسم المعلم *<input name="teacher" maxlength="50" required placeholder="اسم المعلم"></label>
          <label>عدد الدروس<input name="lessons" type="number" min="1" max="500" value="1"></label>
          <label>رابط المحاضرات<input name="link" type="url" placeholder="https://..."></label>
          <label class="wide">وصف الكورس *<textarea name="desc" rows="3" maxlength="240" required placeholder="نبذة مختصرة عن الكورس"></textarea></label>
        </div>
        <button type="submit">إضافة الكورس</button>
      </form>
      <aside class="teacher-addon-info"><div style="font-size:30px">🎓</div><h3>شارك علمك</h3><p>الكورسات التي تضيفها ستظهر في قائمة الكورسات على هذا المتصفح.</p><strong id="teacherAddonCount">0</strong><small>كورسات مضافة</small></aside>
    </div>
    <div class="section-heading"><div><span class="eyebrow">إدارة المحتوى</span><h2>الكورسات التي أضفتها</h2></div></div>
    <div class="teacher-addon-list" id="teacherAddonList"></div>`;
  main.appendChild(page);

  function courseMarkup(c) {
    return `<article class="teacher-addon-course"><div class="cover">🎓</div><div class="body"><small>${esc(c.stage)} · ${esc(c.subject)}</small><b>${esc(c.title)}</b><small>${esc(c.teacher)} · ${Number(c.lessons)||1} درس</small><p>${esc(c.desc)}</p>${c.link?`<a href="${esc(c.link)}" target="_blank" rel="noopener noreferrer">فتح المحاضرات ←</a>`:""}</div></article>`;
  }
  function renderTeacherList() {
    const items=all();
    $("#teacherAddonCount").textContent=items.length;
    $("#teacherAddonList").innerHTML=items.length?items.map(c=>`<div class="teacher-addon-row"><div class="copy"><b>${esc(c.title)}</b><small>${esc(c.subject)} · ${esc(c.stage)} · ${esc(c.lessons)} درس</small></div><button type="button" data-remove-teacher-course="${c.id}">حذف</button></div>`).join(""):'<div class="teacher-addon-empty">لم تضف كورسات بعد. أضف أول كورس من النموذج.</div>';
  }
  function showTeacherPage() {
    document.querySelectorAll(".main .content").forEach(el=>el.classList.add("hidden"));
    page.classList.remove("hidden");
    document.querySelectorAll(".nav-link").forEach(el=>el.classList.remove("active"));
    navBtn.classList.add("active");
    const title=$("#pageTitle"); if(title) title.textContent="مساحة المعلم";
    renderTeacherList();
    $("#sidebar")?.classList.remove("open");
    window.scrollTo({top:0,behavior:"smooth"});
  }
  navBtn.addEventListener("click",showTeacherPage);

  $("#teacherAddonForm").addEventListener("submit",e=>{
    e.preventDefault();
    const fd=new FormData(e.currentTarget);
    const item={
      id:Date.now(),title:String(fd.get("title")).trim(),subject:String(fd.get("subject")).trim(),
      stage:String(fd.get("stage")),teacher:String(fd.get("teacher")).trim(),
      lessons:Math.max(1,Math.min(500,Number(fd.get("lessons"))||1)),
      link:String(fd.get("link")).trim(),desc:String(fd.get("desc")).trim()
    };
    if(item.link && !/^https?:\/\//i.test(item.link)){toast("أدخل رابطاً صحيحاً يبدأ بـ http أو https");return;}
    const items=all();items.push(item);save(items);e.currentTarget.reset();renderTeacherList();toast("تمت إضافة الكورس");
    renderStudentCourses();
  });
  $("#teacherAddonList").addEventListener("click",e=>{
    const btn=e.target.closest("[data-remove-teacher-course]");if(!btn)return;
    save(all().filter(c=>String(c.id)!==btn.dataset.removeTeacherCourse));
    renderTeacherList();renderStudentCourses();toast("تم حذف الكورس");
  });

  function renderStudentCourses() {
    const items=all();
    const target=$("#allCourses");
    if(target && !target.classList.contains("hidden")) {
      target.querySelectorAll("[data-addon-course]").forEach(el=>el.remove());
      items.forEach(c=>{const wrap=document.createElement("div");wrap.dataset.addonCourse="true";wrap.innerHTML=courseMarkup(c);target.appendChild(wrap.firstElementChild);});
    }
    const featured=$("#featuredCourses");
    if(featured) {
      featured.querySelectorAll("[data-addon-course]").forEach(el=>el.remove());
      items.slice(0,3).forEach(c=>{const wrap=document.createElement("div");wrap.dataset.addonCourse="true";wrap.innerHTML=courseMarkup(c);featured.appendChild(wrap.firstElementChild);});
    }
  }
  // عند الانتقال إلى صفحة الكورسات من القائمة، انتظر حتى يرسم التطبيق كورساته الأصلية ثم أضف كورسات المعلمين.
  document.querySelectorAll('.nav-link[data-page="courses"]').forEach(btn=>btn.addEventListener("click",()=>setTimeout(renderStudentCourses,80)));
  document.querySelectorAll('[data-go="courses"]').forEach(btn=>btn.addEventListener("click",()=>setTimeout(renderStudentCourses,80)));
  renderTeacherList();
  renderStudentCourses();
})();'''
addon_path=base/"teacher-addon.js"
addon_path.write_text(addon,encoding="utf-8")
zip_path="/mnt/data/esna3_tareeqak_teacher_addon.zip"
with zipfile.ZipFile(zip_path,"w",zipfile.ZIP_DEFLATED) as z:
    z.write(addon_path,arcname="teacher-addon.js")
print("Created", addon_path, zip_path)
