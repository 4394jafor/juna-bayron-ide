// ─── STATE ───────────────────────────────────────────────
let settings = { fontSize: 15, tabSize: 4, lineNums: true, autocomplete: true, theme: 'dark', bayronPath: '' };
let currentFile = null;
let undoStack = [], redoStack = [];
let acIndex = -1;
let acItems = [];
let files = { 'untitled.bay': '' };
let activeFileName = 'untitled.bay';

// ─── SPLASH ──────────────────────────────────────────────
window.onload = () => {
    loadSettings();
    animateSplash();
};

function animateSplash() {
    const fill = document.getElementById('splash-fill');
    const msg = document.getElementById('splash-msg');
    const msgs = ['تحميل المحرر...', 'تهيئة التلوين...', 'تحضير Design Mode...', 'جاهز!'];
    let p = 0;
    const iv = setInterval(() => {
        p += Math.random() * 20 + 8;
        fill.style.width = Math.min(p, 100) + '%';
        msg.textContent = msgs[Math.min(Math.floor(p/25), msgs.length-1)];
        if (p >= 100) {
            clearInterval(iv);
            setTimeout(() => {
                const splash = document.getElementById('splash');
                splash.style.opacity = '0';
                setTimeout(() => { splash.style.display = 'none'; initEditor(); }, 500);
            }, 300);
        }
    }, 80);
}

function initEditor() {
    applySettings();
    updateLineNums();
    highlight();
    termPrint('مرحباً في Juna — أقوى محرر أكواد عربي في العالم!', 'info');
    termPrint('Invented by Mohammed Kamal Alsultany', 'info');
    termPrint('─────────────────────────────────────────────', 'info');
    termPrint('اضغط F5 لتشغيل الكود | Ctrl+S للحفظ | Ctrl+/ للتعليق', 'info');
    updateStatus();
}

// ─── SETTINGS ────────────────────────────────────────────
function loadSettings() {
    try {
        const s = localStorage.getItem('juna-settings');
        if (s) settings = { ...settings, ...JSON.parse(s) };
    } catch(e) {}
}

function applySettings() {
    const sz = settings.fontSize + 'px';
    document.getElementById('editor').style.fontSize = sz;
    document.getElementById('highlight').style.fontSize = sz;
    document.getElementById('line-nums').style.fontSize = sz;
    const lh = '1.65';
    document.getElementById('editor').style.lineHeight = lh;
    document.getElementById('highlight').style.lineHeight = lh;
    document.getElementById('line-nums').style.lineHeight = lh;
    document.getElementById('set-fontsize').value = settings.fontSize;
    document.getElementById('set-fontsize-val').textContent = settings.fontSize + 'px';
}

function saveSettings() {
    settings.fontSize = parseInt(document.getElementById('set-fontsize').value);
    settings.tabSize = parseInt(document.getElementById('set-tabsize').value);
    settings.lineNums = document.getElementById('set-linenums').checked;
    settings.autocomplete = document.getElementById('set-autocomplete').checked;
    settings.bayronPath = document.getElementById('set-bayron-path').value;
    localStorage.setItem('juna-settings', JSON.stringify(settings));
    applySettings();
    closeModal('modal-settings');
    termPrint('✓ تم حفظ الإعدادات', 'ok');
}

function liveFont(v) {
    document.getElementById('set-fontsize-val').textContent = v + 'px';
    settings.fontSize = parseInt(v);
    applySettings();
}

function toggleLineNums() {
    const ln = document.getElementById('line-nums');
    ln.style.display = document.getElementById('set-linenums').checked ? '' : 'none';
}

// ─── TABS ─────────────────────────────────────────────────
function switchTab(tab) {
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    document.getElementById('tab-' + tab).classList.add('active');
    ['code','design','preview'].forEach(t => {
        document.getElementById('btn-' + t).classList.toggle('tab-active', t === tab);
    });
    if (tab === 'design') generateDesignCode();
}

// ─── EDITOR ──────────────────────────────────────────────
function onInput() {
    const val = document.getElementById('editor').value;
    files[activeFileName] = val;
    updateLineNums();
    highlight();
    updateStatus();
    if (settings.autocomplete) showAutocomplete();
    else hideAutocomplete();
}

function onScroll() {
    const ed = document.getElementById('editor');
    const ov = document.getElementById('highlight');
    const ln = document.getElementById('line-nums');
    ov.scrollTop = ed.scrollTop;
    ov.scrollLeft = ed.scrollLeft;
    ln.scrollTop = ed.scrollTop;
}

function onKeyDown(e) {
    const ed = document.getElementById('editor');

    // Tab
    if (e.key === 'Tab') {
        e.preventDefault();
        if (acItems.length && acIndex >= 0) { insertAC(); return; }
        insertAtCursor(ed, ' '.repeat(settings.tabSize));
        onInput(); return;
    }
    // Escape
    if (e.key === 'Escape') { hideAutocomplete(); return; }
    // Enter in autocomplete
    if (e.key === 'Enter' && acItems.length && acIndex >= 0) { e.preventDefault(); insertAC(); return; }
    // Navigate autocomplete
    if (e.key === 'ArrowDown' && acItems.length) { e.preventDefault(); acIndex = Math.min(acIndex+1, acItems.length-1); renderAC(); return; }
    if (e.key === 'ArrowUp' && acItems.length) { e.preventDefault(); acIndex = Math.max(acIndex-1, 0); renderAC(); return; }

    // Ctrl shortcuts
    if (e.ctrlKey) {
        if (e.key === 's') { e.preventDefault(); saveFile(); return; }
        if (e.key === 'z') { e.preventDefault(); doUndo(); return; }
        if (e.key === 'y') { e.preventDefault(); doRedo(); return; }
        if (e.key === '/') { e.preventDefault(); toggleComment(); return; }
        if (e.key === 'd') { e.preventDefault(); duplicateLine(); return; }
        if (e.key === 'f') { e.preventDefault(); openFind(); return; }
    }
    if (e.key === 'F5') { e.preventDefault(); runCode(); return; }

    // Auto-close brackets
    const pairs = { '(':')', '[':']', '{':'}', '"':'"', "'":"'" };
    if (pairs[e.key]) {
        e.preventDefault();
        const start = ed.selectionStart, end = ed.selectionEnd;
        const sel = ed.value.slice(start, end);
        const ins = e.key + sel + pairs[e.key];
        insertAtCursor(ed, ins, sel.length ? -(sel.length + 1) : -1);
        onInput(); return;
    }

    // Auto-indent after colon
    if (e.key === 'Enter') {
        const pos = ed.selectionStart;
        const lineStart = ed.value.lastIndexOf('\n', pos - 1) + 1;
        const currentLine = ed.value.slice(lineStart, pos);
        const indent = currentLine.match(/^(\s*)/)[1];
        if (currentLine.trimEnd().endsWith(':')) {
            e.preventDefault();
            insertAtCursor(ed, '\n' + indent + ' '.repeat(settings.tabSize));
            onInput(); return;
        }
    }
}

function onCursorMove() { updateStatus(); }

function insertAtCursor(ed, text, offset = 0) {
    const s = ed.selectionStart, e2 = ed.selectionEnd;
    ed.value = ed.value.slice(0, s) + text + ed.value.slice(e2);
    const pos = s + text.length + offset;
    ed.selectionStart = ed.selectionEnd = pos;
}

function updateLineNums() {
    const ed = document.getElementById('editor');
    const count = (ed.value.match(/\n/g) || []).length + 1;
    let s = '';
    for (let i = 1; i <= count; i++) s += i + '\n';
    document.getElementById('line-nums').textContent = s;
}

function highlight() {
    const ed = document.getElementById('editor');
    document.getElementById('highlight').innerHTML = highlightBayron(ed.value);
    onScroll();
}

function updateStatus() {
    const ed = document.getElementById('editor');
    const val = ed.value;
    const pos = ed.selectionStart;
    const lines = val.slice(0, pos).split('\n');
    const line = lines.length;
    const col = lines[lines.length - 1].length + 1;
    const totalLines = (val.match(/\n/g) || []).length + 1;
    const bytes = new TextEncoder().encode(val).length;
    document.getElementById('st-pos').textContent = `سطر ${line}، عمود ${col}`;
    document.getElementById('st-lines').textContent = `${totalLines} سطر`;
    document.getElementById('st-size').textContent = bytes < 1024 ? `${bytes} بايت` : `${(bytes/1024).toFixed(1)} KB`;
}

// ─── AUTOCOMPLETE ─────────────────────────────────────────
function showAutocomplete() {
    const ed = document.getElementById('editor');
    const pos = ed.selectionStart;
    const text = ed.value.slice(0, pos);
    const wordM = text.match(/[؀-ۿ_a-zA-Z][؀-ۿ_a-zA-Z0-9]*$/);
    if (!wordM || wordM[0].length < 2) { hideAutocomplete(); return; }
    const word = wordM[0];
    acItems = AUTOCOMPLETE_WORDS.filter(w => w.startsWith(word) && w !== word).slice(0, 8);
    if (!acItems.length) { hideAutocomplete(); return; }
    acIndex = 0;
    renderAC();
    positionAC(ed, pos);
}

function renderAC() {
    const box = document.getElementById('autocomplete-box');
    box.style.display = 'block';
    box.innerHTML = acItems.map((w, i) => {
        const type = KEYWORDS.control.includes(w) ? 'كلمة' : KEYWORDS.builtin.includes(w) ? 'دالة' : 'رمز';
        return `<div class="ac-item ${i===acIndex?'ac-selected':''}" onclick="acClick(${i})">${esc(w)} <span class="ac-type">${type}</span></div>`;
    }).join('');
}

function positionAC(ed, pos) {
    const box = document.getElementById('autocomplete-box');
    const lines = ed.value.slice(0, pos).split('\n');
    const line = lines.length;
    const fs = settings.fontSize;
    const lh = fs * 1.65;
    const rect = ed.getBoundingClientRect();
    const col = lines[lines.length-1].length;
    box.style.top = (rect.top + line * lh + 14) + 'px';
    box.style.left = (rect.left + col * fs * 0.6 + 14) + 'px';
}

function hideAutocomplete() { document.getElementById('autocomplete-box').style.display = 'none'; acItems = []; acIndex = -1; }

function insertAC() {
    if (acIndex < 0 || !acItems.length) return;
    const ed = document.getElementById('editor');
    const pos = ed.selectionStart;
    const text = ed.value.slice(0, pos);
    const wordM = text.match(/[؀-ۿ_a-zA-Z][؀-ۿ_a-zA-Z0-9]*$/);
    if (!wordM) return;
    const start = pos - wordM[0].length;
    ed.value = ed.value.slice(0, start) + acItems[acIndex] + ed.value.slice(pos);
    ed.selectionStart = ed.selectionEnd = start + acItems[acIndex].length;
    hideAutocomplete();
    onInput();
}

function acClick(i) { acIndex = i; insertAC(); }

// ─── EDIT OPS ────────────────────────────────────────────
function toggleComment() {
    const ed = document.getElementById('editor');
    const start = ed.selectionStart, end = ed.selectionEnd;
    const val = ed.value;
    const lineStart = val.lastIndexOf('\n', start-1) + 1;
    const lineEnd = val.indexOf('\n', end);
    const line = val.slice(lineStart, lineEnd === -1 ? undefined : lineEnd);
    let newLine = line.startsWith('# ') ? line.slice(2) : '# ' + line;
    ed.value = val.slice(0, lineStart) + newLine + (lineEnd === -1 ? '' : val.slice(lineEnd));
    onInput();
}

function duplicateLine() {
    const ed = document.getElementById('editor');
    const pos = ed.selectionStart;
    const val = ed.value;
    const lineStart = val.lastIndexOf('\n', pos-1) + 1;
    const lineEnd = val.indexOf('\n', pos);
    const line = lineEnd === -1 ? val.slice(lineStart) : val.slice(lineStart, lineEnd);
    ed.value = val.slice(0, lineEnd === -1 ? val.length : lineEnd) + '\n' + line + (lineEnd === -1 ? '' : val.slice(lineEnd));
    onInput();
}

function doUndo() { document.getElementById('editor').focus(); document.execCommand('undo'); onInput(); }
function doRedo() { document.getElementById('editor').focus(); document.execCommand('redo'); onInput(); }

function openFind() {
    const q = prompt('بحث:');
    if (!q) return;
    const ed = document.getElementById('editor');
    const idx = ed.value.indexOf(q);
    if (idx !== -1) { ed.selectionStart = idx; ed.selectionEnd = idx + q.length; ed.focus(); }
    else termPrint('لم يتم العثور على: ' + q, 'warn');
}

// ─── FILE OPS ────────────────────────────────────────────
function newFile() {
    const name = prompt('اسم الملف:', 'جديد.bay') || 'جديد.bay';
    files[name] = '';
    activeFileName = name;
    document.getElementById('editor').value = '';
    document.getElementById('filename-display').textContent = name;
    addFileEntry(name);
    onInput();
}

function addFileEntry(name) {
    const list = document.getElementById('file-list');
    document.querySelectorAll('.file-entry').forEach(e => e.classList.remove('active'));
    const div = document.createElement('div');
    div.className = 'file-entry active';
    div.innerHTML = `<span class="file-icon">🔷</span> ${name}`;
    div.onclick = () => selectFile(div, name);
    list.appendChild(div);
}

function selectFile(el, name) {
    files[activeFileName] = document.getElementById('editor').value;
    activeFileName = name;
    document.querySelectorAll('.file-entry').forEach(e => e.classList.remove('active'));
    el.classList.add('active');
    document.getElementById('editor').value = files[name] || '';
    document.getElementById('filename-display').textContent = name;
    onInput();
}

function saveFile() {
    files[activeFileName] = document.getElementById('editor').value;
    localStorage.setItem('juna-file-' + activeFileName, document.getElementById('editor').value);
    termPrint('✓ تم الحفظ: ' + activeFileName, 'ok');
}

function downloadFile() {
    const content = document.getElementById('editor').value;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = activeFileName;
    a.click();
    termPrint('✓ تم تحميل: ' + activeFileName, 'ok');
}

function openFile() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.bay,.py,.txt';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            files[file.name] = ev.target.result;
            activeFileName = file.name;
            document.getElementById('editor').value = ev.target.result;
            document.getElementById('filename-display').textContent = file.name;
            addFileEntry(file.name);
            onInput();
            termPrint('✓ تم فتح: ' + file.name, 'ok');
        };
        reader.readAsText(file, 'utf-8');
    };
    input.click();
}

// ─── SNIPPETS ─────────────────────────────────────────────
function insertSnippet(key) {
    const ed = document.getElementById('editor');
    const s = SNIPPETS[key] || '';
    const pos = ed.selectionStart;
    ed.value = ed.value.slice(0, pos) + s + ed.value.slice(pos);
    ed.selectionStart = ed.selectionEnd = pos + s.length;
    ed.focus();
    onInput();
    switchTab('code');
}

// ─── RUN CODE ─────────────────────────────────────────────
async function runCode() {
    const code = document.getElementById('editor').value.trim();
    if (!code) { termPrint('⚠ الكود فارغ', 'warn'); return; }

    const btn = document.getElementById('run-btn');
    btn.classList.add('running');
    btn.innerHTML = '<span>⏳</span> جاري...';

    switchTermTab('output');
    termPrint('─────────────────────────────────────', 'info');
    termPrint('▶ تشغيل الكود...', 'info');

    // Show transpiled
    const pythonCode = transpile(code);
    document.getElementById('term-transpiled').textContent = pythonCode;

    // Execute via Pyodide (browser Python) or show transpiled
    try {
        if (window.pyodide) {
            const output = [];
            window.pyodide.globals.set('__builtins__', window.pyodide.globals.get('__builtins__'));
            const old = console.log;
            window.pyodide.runPython(`
import sys, io
sys.stdout = io.StringIO()
`);
            window.pyodide.runPython(pythonCode);
            const out = window.pyodide.runPython('sys.stdout.getvalue()');
            termPrint(out || '(لا يوجد مخرجات)', 'out');
            termPrint('✓ انتهى بنجاح', 'ok');
        } else {
            termPrint(simulateRun(code, pythonCode), 'out');
            termPrint('─────────────────────────────────────', 'info');
            termPrint('ℹ الكود تم تحويله إلى Python — شاهده في تبويب "الكود المُحوَّل"', 'info');
        }
    } catch(e) {
        termPrint('خطأ: ' + e.message, 'err');
        switchTermTab('errors');
        document.getElementById('term-errors').textContent = e.toString();
    }

    btn.classList.remove('running');
    btn.innerHTML = '<span>▶</span> تشغيل';
}

function simulateRun(code, pythonCode) {
    const lines = code.split('\n');
    const outputs = [];
    for (const line of lines) {
        const tl = line.trim();
        const printM = tl.match(/^(?:طباعة|print)\s*\((.+)\)\s*$/);
        if (printM) {
            let val = printM[1].trim();
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
                outputs.push(val.slice(1, -1));
            } else {
                outputs.push(val);
            }
        }
    }
    return outputs.length ? outputs.join('\n') : '(يحتاج Python محلياً للتشغيل الكامل)';
}

function transpile(code) {
    const map = {
        'طباعة':'print','مدخل':'input','مدى':'range','طول':'len','نوع':'type',
        'قائمة':'list','قاموس':'dict','مجموعة':'set','صف':'tuple','مجموع':'sum',
        'أكبر':'max','أصغر':'min','مطلق':'abs','تحويل_نص':'str','تحويل_رقم':'int',
        'تحويل_عشري':'float','تحويل_منطق':'bool','فرز':'sorted','عكس':'reversed',
        'تعداد':'enumerate','دمج':'zip','كل':'all','أي':'any','افتح':'open',
        'دالة':'def','كلاس':'class','ذاتي':'self','هذا':'self',
        'إذا':'if','وإلاإذا':'elif','وإلا':'else','بينما':'while','حلقة':'for',
        'في':'in','توقف':'break','تخطى':'continue','تمرير':'pass',
        'إرجع':'return','أرجع':'return','حاول':'try','إلا':'except',
        'أخيراً':'finally','رفع':'raise','مع':'with','كـ':'as',
        'عالمي':'global','محلي':'nonlocal','حذف':'del','تأكيد':'assert',
        'إنتاج':'yield','لام':'lambda','من':'from','استيراد':'import',
        'مزامن':'async','انتظر':'await',
        'صحيح':'True','خطأ':'False','فارغ':'None',
        'و':'and','أو':'or','ليس':'not','هو':'is',
        'استثناء':'Exception','أصل':'super','مثيل_من':'isinstance',
    };
    let result = code;
    const sorted = Object.keys(map).sort((a,b) => b.length - a.length);
    for (const ar of sorted) {
        const py = map[ar];
        result = result.replace(new RegExp(`(?<![\\w\\u0600-\\u06FF])${ar}(?![\\w\\u0600-\\u06FF])`, 'g'), py);
    }
    return result;
}

// ─── TERMINAL ─────────────────────────────────────────────
function termPrint(text, type = 'out') {
    const pane = document.getElementById('term-output');
    const div = document.createElement('div');
    div.className = 't-' + type;
    div.textContent = text;
    pane.appendChild(div);
    pane.scrollTop = pane.scrollHeight;
}

function clearTerminal() {
    ['term-output','term-errors','term-transpiled'].forEach(id => document.getElementById(id).innerHTML = '');
}

function copyTerminal() {
    const active = document.querySelector('.term-pane.active');
    navigator.clipboard.writeText(active.textContent);
    termPrint('✓ تم النسخ', 'ok');
}

function switchTermTab(tab) {
    document.querySelectorAll('.t-tab').forEach((t,i) => {
        const tabs = ['output','errors','transpiled'];
        t.classList.toggle('active', tabs[i] === tab);
    });
    document.querySelectorAll('.term-pane').forEach(p => p.classList.remove('active'));
    document.getElementById('term-' + tab).classList.add('active');
}

// ─── THEME ────────────────────────────────────────────────
let isDark = true;
function toggleTheme() {
    isDark = !isDark;
    document.body.style.filter = isDark ? '' : 'invert(1) hue-rotate(180deg)';
    termPrint('تم تغيير الثيم', 'info');
}

// ─── MODALS ───────────────────────────────────────────────
function openSettings() { document.getElementById('modal-settings').style.display = 'flex'; }
function openHelp() { document.getElementById('modal-help').style.display = 'flex'; }
function closeModal(id) { document.getElementById(id).style.display = 'none'; }

// Close modal on outside click
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) closeModal(e.target.id);
});

// ─── TERMINAL RESIZE ──────────────────────────────────────
function startResizeTerm(e) {
    const ts = document.getElementById('terminal-section');
    const startY = e.clientY;
    const startH = ts.offsetHeight;
    function move(e) { ts.style.height = Math.max(80, Math.min(500, startH - (e.clientY - startY))) + 'px'; }
    function up() { document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); }
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
}

function esc(t) { return String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }