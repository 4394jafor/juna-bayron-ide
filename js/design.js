let designEls = [];
let selEl = null;
let elId = 0;
let dragType = null;

function elDragStart(e) {
    dragType = e.currentTarget.dataset.el;
}

function elDrop(e) {
    if (!dragType) return;
    const canvas = document.getElementById('design-canvas');
    const r = canvas.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    document.querySelector('.canvas-empty') && document.querySelector('.canvas-empty').remove();
    placeElement(dragType, x - 40, y - 20);
    dragType = null;
    generateDesignCode();
}

function placeElement(type, x, y) {
    const id = 'el' + (++elId);
    const canvas = document.getElementById('design-canvas');
    const wrap = document.createElement('div');
    wrap.className = 'placed';
    wrap.id = id;
    wrap.style.left = Math.max(0, x) + 'px';
    wrap.style.top = Math.max(0, y) + 'px';
    wrap.dataset.type = type;

    const elData = { id, type, label: defaultLabel(type), color: '#58a6ff', action: '', x, y };
    wrap.innerHTML = buildEl(type, elData) + `<div class="resize-handle"></div><div class="del-handle" onclick="deleteEl('${id}')">✕</div>`;

    wrap.addEventListener('mousedown', (e) => {
        if (e.target.classList.contains('resize-handle') || e.target.classList.contains('del-handle')) return;
        e.preventDefault();
        selectEl(wrap);
        startDrag(e, wrap, canvas);
    });

    wrap.querySelector('.resize-handle').addEventListener('mousedown', (e) => {
        e.preventDefault(); e.stopPropagation();
        startResize(e, wrap);
    });

    canvas.appendChild(wrap);
    designEls.push(elData);
    selectEl(wrap);
}

function defaultLabel(type) {
    return { button:'زر', label:'نص هنا', input:'اكتب...', textarea:'نص طويل', image:'🖼', checkbox:'اختيار', select:'خيار 1', progress:'50', divider:'', container:'' }[type] || type;
}

function buildEl(type, d) {
    switch(type) {
        case 'button':   return `<button class="d-btn" style="background:${d.color}">${d.label}</button>`;
        case 'label':    return `<span class="d-label">${d.label}</span>`;
        case 'input':    return `<input class="d-input" placeholder="${d.label}" readonly>`;
        case 'textarea': return `<textarea class="d-textarea" readonly>${d.label}</textarea>`;
        case 'image':    return `<div class="d-image">🖼️</div>`;
        case 'checkbox': return `<div class="d-checkbox"><input type="checkbox" disabled> ${d.label}</div>`;
        case 'select':   return `<select class="d-select" disabled><option>${d.label}</option></select>`;
        case 'progress': return `<input type="range" class="d-progress" value="${d.label||50}" disabled>`;
        case 'divider':  return `<div class="d-divider"></div>`;
        case 'container':return `<div class="d-container"></div>`;
        default: return `<div>${d.label}</div>`;
    }
}

function selectEl(wrap) {
    document.querySelectorAll('.placed').forEach(e => e.classList.remove('sel'));
    wrap.classList.add('sel');
    selEl = wrap;
    showProps(wrap.dataset.type, wrap.id);
}

function canvasClick(e) {
    if (e.target === document.getElementById('design-canvas') || e.target === document.getElementById('canvas-grid')) {
        document.querySelectorAll('.placed').forEach(e => e.classList.remove('sel'));
        selEl = null;
        document.getElementById('props-panel').innerHTML = '<div class="hint-text">اختر عنصراً</div>';
    }
}

function showProps(type, id) {
    const elData = designEls.find(e => e.id === id);
    if (!elData) return;
    let html = '';
    if (type !== 'divider' && type !== 'container') {
        html += `<div class="prop-group"><label>النص</label><input type="text" value="${elData.label}" oninput="updateProp('${id}','label',this.value)"></div>`;
    }
    if (type === 'button') {
        html += `<div class="prop-group"><label>اللون</label><input type="color" value="${elData.color||'#58a6ff'}" oninput="updateProp('${id}','color',this.value)"></div>`;
        html += `<div class="prop-group"><label>إجراء الضغط (كود Bayron)</label><input type="text" placeholder="طباعة('مرحباً')" value="${elData.action||''}" oninput="updateProp('${id}','action',this.value)"></div>`;
    }
    html += `<div class="prop-group" style="margin-top:8px"><button onclick="deleteEl('${id}')" style="width:100%;background:transparent;border:1px solid var(--red);color:var(--red);border-radius:5px;padding:5px;cursor:pointer;font-size:12px">🗑 حذف</button></div>`;
    document.getElementById('props-panel').innerHTML = html;
}

function updateProp(id, prop, val) {
    const elData = designEls.find(e => e.id === id);
    if (!elData) return;
    elData[prop] = val;
    const wrap = document.getElementById(id);
    if (wrap) {
        const rh = wrap.querySelector('.resize-handle').outerHTML;
        const dh = wrap.querySelector('.del-handle').outerHTML;
        wrap.innerHTML = buildEl(elData.type, elData) + rh + dh;
        wrap.querySelector('.del-handle').onclick = () => deleteEl(id);
        wrap.querySelector('.resize-handle').addEventListener('mousedown', (e) => {
            e.preventDefault(); e.stopPropagation();
            startResize(e, wrap);
        });
    }
    generateDesignCode();
}

function deleteEl(id) {
    designEls = designEls.filter(e => e.id !== id);
    const el = document.getElementById(id);
    if (el) el.remove();
    selEl = null;
    document.getElementById('props-panel').innerHTML = '<div class="hint-text">اختر عنصراً</div>';
    generateDesignCode();
}

function startDrag(e, wrap, canvas) {
    const startX = e.clientX, startY = e.clientY;
    const startL = parseInt(wrap.style.left) || 0;
    const startT = parseInt(wrap.style.top) || 0;
    function move(e) {
        wrap.style.left = Math.max(0, startL + e.clientX - startX) + 'px';
        wrap.style.top = Math.max(0, startT + e.clientY - startY) + 'px';
    }
    function up() {
        document.removeEventListener('mousemove', move);
        document.removeEventListener('mouseup', up);
        const elData = designEls.find(el => el.id === wrap.id);
        if (elData) { elData.x = parseInt(wrap.style.left); elData.y = parseInt(wrap.style.top); }
        generateDesignCode();
    }
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
}

function startResize(e, wrap) {
    const startX = e.clientX, startY = e.clientY;
    const startW = wrap.offsetWidth, startH = wrap.offsetHeight;
    function move(e) {
        wrap.style.width = Math.max(60, startW + e.clientX - startX) + 'px';
        wrap.style.height = Math.max(24, startH + e.clientY - startY) + 'px';
    }
    function up() {
        document.removeEventListener('mousemove', move);
        document.removeEventListener('mouseup', up);
        generateDesignCode();
    }
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
}

function generateDesignCode() {
    if (!designEls.length) {
        document.getElementById('gen-code-view').textContent = '# اسحب عناصر لتوليد الكود';
        return;
    }
    let code = '# كود مُولَّد بواسطة Juna Design Mode\n# by Mohammed Kamal Alsultany\n\n';
    code += 'استيراد tkinter كـ tk\nمن tkinter استيراد messagebox\n\n';
    code += 'نافذة = tk.Tk()\nنافذة.title("تطبيقي")\nنافذة.geometry("600x400")\nنافذة.configure(bg="#0d1117")\n\n';

    designEls.forEach(el => {
        const { id, type, label, color, action, x, y } = el;
        switch (type) {
            case 'button':
                if (action) code += `دالة ${id}_ضغط():\n    ${action}\n\n`;
                code += `${id} = tk.Button(نافذة, text="${label}", bg="${color||'#58a6ff'}", fg="white"${action ? `, command=${id}_ضغط` : ''})\n`;
                code += `${id}.place(x=${x}, y=${y})\n\n`;
                break;
            case 'label':
                code += `${id} = tk.Label(نافذة, text="${label}", fg="white", bg="#0d1117")\n${id}.place(x=${x}, y=${y})\n\n`;
                break;
            case 'input':
                code += `${id} = tk.Entry(نافذة, bg="#21262d", fg="white")\n${id}.place(x=${x}, y=${y})\n\n`;
                break;
            case 'textarea':
                code += `${id} = tk.Text(نافذة, bg="#21262d", fg="white", width=30, height=5)\n${id}.place(x=${x}, y=${y})\n\n`;
                break;
            case 'checkbox':
                code += `${id}_var = tk.BooleanVar()\n${id} = tk.Checkbutton(نافذة, text="${label}", variable=${id}_var, fg="white", bg="#0d1117")\n${id}.place(x=${x}, y=${y})\n\n`;
                break;
            case 'select':
                code += `${id}_var = tk.StringVar(value="${label}")\n${id} = tk.OptionMenu(نافذة, ${id}_var, "${label}")\n${id}.place(x=${x}, y=${y})\n\n`;
                break;
        }
    });

    code += 'نافذة.mainloop()\n';
    document.getElementById('gen-code-view').textContent = code;
}

function sendCodeToEditor() {
    const code = document.getElementById('gen-code-view').textContent;
    document.getElementById('editor').value = code;
    switchTab('code');
    onInput();
    termPrint('✓ تم إرسال الكود للمحرر', 'ok');
}

function copyGenCode() {
    navigator.clipboard.writeText(document.getElementById('gen-code-view').textContent);
    termPrint('✓ تم نسخ الكود', 'ok');
}