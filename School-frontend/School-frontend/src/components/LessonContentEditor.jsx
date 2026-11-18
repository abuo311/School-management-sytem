import React, { useEffect, useRef } from 'react';
import { Bold, GitBranch, Italic, List, ListOrdered, Underline } from 'lucide-react';

const allowedTags = new Set([
    'P', 'DIV', 'BR', 'STRONG', 'B', 'EM', 'I', 'U', 'UL', 'OL', 'LI',
    'H2', 'H3', 'BLOCKQUOTE', 'SUB', 'SUP', 'SPAN'
]);
const allowedClasses = new Set(['lms-diagram', 'lms-diagram-node', 'lms-diagram-arrow', 'lms-equation']);
const removedTags = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'SVG', 'VIDEO', 'AUDIO']);

export const sanitizeLessonContent = html => {
    if (!html) return '';
    const parsed = new DOMParser().parseFromString(html, 'text/html');
    const cleanNode = node => {
        if (node.nodeType === Node.TEXT_NODE) return document.createTextNode(node.textContent || '');
        const fragment = document.createDocumentFragment();
        if (node.nodeType !== Node.ELEMENT_NODE || removedTags.has(node.tagName)) return fragment;
        const target = allowedTags.has(node.tagName) ? parsed.createElement(node.tagName.toLowerCase()) : fragment;
        if (target !== fragment && allowedClasses.has(node.getAttribute('class'))) {
            target.className = node.getAttribute('class');
        }
        Array.from(node.childNodes).forEach(child => target.appendChild(cleanNode(child)));
        return target;
    };
    const container = document.createElement('div');
    Array.from(parsed.body.childNodes).forEach(node => container.appendChild(cleanNode(node)));
    return container.innerHTML;
};

const mathSymbols = ['π', 'θ', 'α', 'β', '∑', '∫', '√', '≤', '≥', '≠', '±', '×', '÷', '∞', '→'];

const LessonContentEditor = ({ value, onChange }) => {
    const editorRef = useRef(null);

    useEffect(() => {
        if (editorRef.current && editorRef.current.innerHTML !== value) {
            editorRef.current.innerHTML = sanitizeLessonContent(value);
        }
    }, [value]);

    const updateContent = event => onChange(event.currentTarget.innerHTML);
    const applyCommand = command => {
        document.execCommand(command, false);
        onChange(editorRef.current.innerHTML);
        editorRef.current.focus();
    };
    const insertHtml = html => {
        editorRef.current.focus();
        document.execCommand('insertHTML', false, html);
        onChange(editorRef.current.innerHTML);
    };
    const insertText = text => {
        editorRef.current.focus();
        document.execCommand('insertText', false, text);
        onChange(editorRef.current.innerHTML);
    };
    const pastePlainText = event => {
        event.preventDefault();
        insertText(event.clipboardData.getData('text/plain'));
    };

    return (
        <div className="mb-3">
            <label className="form-label" htmlFor="lesson-content-editor">Lesson content / notes</label>
            <div className="lms-editor-toolbar" role="toolbar" aria-label="Lesson content formatting">
                <button type="button" className="btn btn-sm btn-outline-secondary" title="Bold" aria-label="Bold"
                    onMouseDown={event => event.preventDefault()} onClick={() => applyCommand('bold')}><Bold size={15} /></button>
                <button type="button" className="btn btn-sm btn-outline-secondary" title="Italic" aria-label="Italic"
                    onMouseDown={event => event.preventDefault()} onClick={() => applyCommand('italic')}><Italic size={15} /></button>
                <button type="button" className="btn btn-sm btn-outline-secondary" title="Underline" aria-label="Underline"
                    onMouseDown={event => event.preventDefault()} onClick={() => applyCommand('underline')}><Underline size={15} /></button>
                <button type="button" className="btn btn-sm btn-outline-secondary" title="Subscript" aria-label="Subscript"
                    onMouseDown={event => event.preventDefault()} onClick={() => applyCommand('subscript')}>x<sub>2</sub></button>
                <button type="button" className="btn btn-sm btn-outline-secondary" title="Superscript" aria-label="Superscript"
                    onMouseDown={event => event.preventDefault()} onClick={() => applyCommand('superscript')}>x<sup>2</sup></button>
                <button type="button" className="btn btn-sm btn-outline-secondary" title="Bulleted list" aria-label="Bulleted list"
                    onMouseDown={event => event.preventDefault()} onClick={() => applyCommand('insertUnorderedList')}><List size={15} /></button>
                <button type="button" className="btn btn-sm btn-outline-secondary" title="Numbered list" aria-label="Numbered list"
                    onMouseDown={event => event.preventDefault()} onClick={() => applyCommand('insertOrderedList')}><ListOrdered size={15} /></button>
                <button type="button" className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1"
                    title="Insert an editable process diagram" aria-label="Insert process diagram"
                    onMouseDown={event => event.preventDefault()}
                    onClick={() => insertHtml('<div class="lms-diagram"><span class="lms-diagram-node">Start</span><span class="lms-diagram-arrow">→</span><span class="lms-diagram-node">Step 1</span><span class="lms-diagram-arrow">→</span><span class="lms-diagram-node">Finish</span></div>')}>
                    <GitBranch size={15} /><span>Diagram</span>
                </button>
                <button type="button" className="btn btn-sm btn-outline-secondary"
                    title="Insert a styled equation area" aria-label="Insert equation style"
                    onMouseDown={event => event.preventDefault()}
                    onClick={() => insertHtml('<div class="lms-equation">Type equation here</div>')}>Equation</button>
                <div className="lms-math-symbols" role="group" aria-label="Math symbols">
                    {mathSymbols.map(symbol => (
                        <button key={symbol} type="button" className="btn btn-sm btn-light" title={`Insert ${symbol}`}
                            aria-label={`Insert ${symbol}`} onMouseDown={event => event.preventDefault()}
                            onClick={() => insertText(symbol)}>{symbol}</button>
                    ))}
                </div>
            </div>
            <div ref={editorRef} id="lesson-content-editor" className="form-control lms-content-editor"
                contentEditable suppressContentEditableWarning role="textbox" aria-multiline="true"
                aria-label="Lesson content / notes" onInput={updateContent} onPaste={pastePlainText}
                onDrop={event => event.preventDefault()} />
            <small className="form-text text-muted">Format text, insert math symbols, or add an editable process diagram.</small>
        </div>
    );
};

export default LessonContentEditor;
