import { describe, it, expect } from 'vitest'
import { renderLatex, generateToc } from '../../src/utils/latex'

describe('renderLatex', () => {
  it('returns input unchanged when no math markers present', () => {
    const html = '<p>普通段落 <strong>加粗</strong> <code>var_x</code> 与 <a href="/x">链接</a>。</p>'
    expect(renderLatex(html)).toBe(html)
  })

  it('renders tiptap block and inline math nodes', () => {
    const out = renderLatex('<div data-latex="E=mc^2" data-type="block-math"></div><span data-latex="x_1" data-type="inline-math"></span>')
    expect(out).toContain('katex')
    expect(out).toContain('katex-display')
    expect(out).not.toContain('data-type="block-math"')
    expect(out).not.toContain('data-type="inline-math"')
  })

  it('renders legacy $$...$$ and $...$ delimiters', () => {
    const out = renderLatex('<p>块级 $$\\frac{a}{b}$$ 与内联 $x+y$ 公式。</p>')
    expect(out).toContain('katex')
    expect(out).not.toContain('$$')
  })

  it('leaves an unpaired dollar sign untouched', () => {
    const html = '<p>价格是 5$ 整。</p>'
    expect(renderLatex(html)).toBe(html)
  })

  it('protects code and pre blocks from math rendering', () => {
    const out = renderLatex('<p>$$a$$</p><pre><code>const x = "$100"</code></pre>')
    expect(out).toContain('katex')
    expect(out).toContain('<pre><code>const x = "$100"</code></pre>')
  })

  it('restores all placeholders in order on tag-heavy documents', () => {
    const paragraphs = Array.from({ length: 120 }, (_, i) =>
      `<p class="p${i}">第 ${i} 段 <strong>加粗</strong> <a href="/ref/${i}">链接</a>，金额 ${i}$。</p>`
    ).join('\n')
    const html = `${paragraphs}<p>公式 $$x^2$$ 结束。</p>`
    const out = renderLatex(html)
    expect(out).toContain('katex')
    for (let i = 0; i < 120; i++) {
      expect(out).toContain(`class="p${i}"`)
      expect(out).toContain(`href="/ref/${i}"`)
    }
    expect(out).not.toContain('%%PLACEHOLDER_')
  })
})

describe('generateToc', () => {
  it('adds sequential ids and collects heading text', () => {
    const { html, headings } = generateToc('<h2>标题A</h2><p>x</p><h3>标题<b>B</b></h3>')
    expect(headings).toEqual([
      { id: 'heading-1', level: 2, text: '标题A' },
      { id: 'heading-2', level: 3, text: '标题B' },
    ])
    expect(html).toContain('<h2 id="heading-1">标题A</h2>')
    expect(html).toContain('<h3 id="heading-2">标题<b>B</b></h3>')
  })
})
