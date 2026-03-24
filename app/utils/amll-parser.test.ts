/**
 * 歌词解析器测试
 */

// 模拟 DOMParser (Node.js 环境)
class MockDOMParser {
  parseFromString(xmlStr: string, contentType: string) {
    // 简单的 XML 解析模拟
    const doc = {
      querySelector: (selector: string) => null,
      getElementsByTagName: (tag: string) => {
        if (tag === 'p') {
          // 模拟 TTML 的 p 元素
          return [
            {
              getAttribute: (attr: string) => {
                if (attr === 'begin') return '00:00:01.000'
                if (attr === 'end') return '00:00:05.000'
                if (attr === 'ttm:agent') return undefined
                return null
              },
              childNodes: [
                { nodeType: 3, textContent: 'Hello ' }, // 文本节点
                { 
                  nodeType: 1, 
                  tagName: 'span',
                  getAttribute: (attr: string) => {
                    if (attr === 'begin') return '00:00:01.000'
                    if (attr === 'end') return '00:00:02.000'
                    if (attr === 'ttm:role') return null
                    return null
                  },
                  textContent: 'World'
                }
              ],
              textContent: 'Hello World'
            }
          ] as any[]
        }
        return []
      }
    }
    return doc
  }
}

// 导入解析器
import { parseAmllLyrics } from './amll-parser'

console.log('=== 歌词解析器测试 ===\n')

// 测试 1: LRC 解析 - 相同时间的翻译
console.log('测试 1: LRC 解析 - 相同时间的翻译')
const lrcWithTranslation = `[00:01.000] Hello World
[00:01.000] 你好世界
[00:05.000] Goodbye
[00:05.000] 再见`

const result1 = parseAmllLyrics(lrcWithTranslation, 'lrc')
console.log('解析结果:', JSON.stringify(result1, null, 2))
console.log('第一句翻译:', result1[0]?.translatedLyric) // 应该是 "你好世界"
console.log('第二句翻译:', result1[1]?.translatedLyric) // 应该是 "再见"
console.log('总行数:', result1.length) // 应该是 2（不是 4）
console.log('')

// 测试 2: LRC 解析 - 带 tlyric 参数
console.log('测试 2: LRC 解析 - 带 tlyric 参数')
const lrcSimple = `[00:01.000] Hello World
[00:05.000] Goodbye`

const tlyric = `[00:01.000] 你好世界
[00:05.000] 再见`

const result2 = parseAmllLyrics(lrcSimple, 'lrc', tlyric)
console.log('解析结果:', JSON.stringify(result2, null, 2))
console.log('第一句翻译:', result2[0]?.translatedLyric) // 应该是 "你好世界"
console.log('第二句翻译:', result2[1]?.translatedLyric) // 应该是 "再见"
console.log('')

// 测试 3: TTML 解析 - 英文空格
console.log('测试 3: TTML 解析 - 英文空格')
const ttml = `<?xml version="1.0" encoding="utf-8"?>
<tt xmlns:tts="http://www.w3.org/ns/ttml#styling" xmlns:ttm="http://www.w3.org/ns/ttml#metadata">
  <body>
    <div>
      <p begin="00:00:01.000" end="00:00:05.000">
        <span begin="00:00:01.000" end="00:00:02.000">Hello</span>
        <span begin="00:00:02.000" end="00:00:03.000"> </span>
        <span begin="00:00:03.000" end="00:00:04.000">World</span>
      </p>
    </div>
  </body>
</tt>`

// @ts-ignore
global.DOMParser = MockDOMParser
const result3 = parseAmllLyrics(ttml, 'ttml')
console.log('解析结果:', JSON.stringify(result3, null, 2))
console.log('第一行歌词:', result3[0]?.words.map(w => w.word).join('')) // 应该是 "Hello World"
console.log('')

console.log('=== 测试完成 ===')
