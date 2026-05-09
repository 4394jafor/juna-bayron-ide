function esc(t) {
    return t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function highlightBayron(code) {
    const lines = code.split('\n');
    return lines.map(line => highlightLine(line)).join('\n');
}

function highlightLine(line) {
    const commentIdx = findCommentIdx(line);
    let codePart = line, commentPart = '';
    if (commentIdx !== -1) {
        commentPart = line.slice(commentIdx);
        codePart = line.slice(0, commentIdx);
    }
    return tokenize(codePart) + (commentPart ? `<span class="cmt">${esc(commentPart)}</span>` : '');
}

function findCommentIdx(line) {
    let inStr = false, q = '';
    for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (inStr) { if (c === q && line[i-1] !== '\\') inStr = false; }
        else if (c === '"' || c === "'") { inStr = true; q = c; }
        else if (c === '#') return i;
    }
    return -1;
}

function tokenize(code) {
    let result = '';
    let i = 0;
    while (i < code.length) {
        // Strings
        if (code[i] === '"' || code[i] === "'") {
            const q = code[i];
            let s = q; i++;
            while (i < code.length) {
                s += code[i];
                if (code[i] === q && code[i-1] !== '\\') { i++; break; }
                i++;
            }
            result += `<span class="str">${esc(s)}</span>`;
            continue;
        }
        // Numbers
        const numM = code.slice(i).match(/^-?\d+(\.\d+)?/);
        if (numM && (i === 0 || /[\s(,+\-*\/=<>!%&|^~]/.test(code[i-1]))) {
            result += `<span class="num">${esc(numM[0])}</span>`;
            i += numM[0].length;
            continue;
        }
        // Words
        const wordM = code.slice(i).match(/^[؀-ۿ_a-zA-Z][؀-ۿ_a-zA-Z0-9]*/);
        if (wordM) {
            const w = wordM[0];
            result += colorWord(w, code, i);
            i += w.length;
            continue;
        }
        // Operators
        const opM = code.slice(i).match(/^(==|!=|<=|>=|\*\*|\/\/|[+\-*\/%=<>&|^~@])/);
        if (opM) {
            result += `<span class="op">${esc(opM[0])}</span>`;
            i += opM[0].length;
            continue;
        }
        result += esc(code[i]);
        i++;
    }
    return result;
}

function colorWord(w, code, i) {
    const after = code[i + w.length] || ' ';
    // def/دالة → next word is function name
    if (KEYWORDS.define.includes(w)) {
        if (w === 'def' || w === 'دالة') return `<span class="kw">${esc(w)}</span>`;
        if (w === 'class' || w === 'كلاس') return `<span class="kw">${esc(w)}</span>`;
    }
    if (KEYWORDS.self.includes(w)) return `<span class="self">${esc(w)}</span>`;
    if (KEYWORDS.boolean.includes(w)) return `<span class="bool">${esc(w)}</span>`;
    if (KEYWORDS.control.includes(w)) return `<span class="kw">${esc(w)}</span>`;
    if (KEYWORDS.exceptions.includes(w)) return `<span class="kw2">${esc(w)}</span>`;
    if (KEYWORDS.builtin.includes(w)) return `<span class="bi">${esc(w)}</span>`;
    // Function call
    if (after === '(') return `<span class="fn">${esc(w)}</span>`;
    return esc(w);
}