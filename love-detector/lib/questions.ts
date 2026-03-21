export interface QuestionOption {
  text: string
  score: number // 0-100, higher = more honest/trustworthy
}

export interface Question {
  id: number
  text: string
  category: '忠诚度' | '手机隐私' | '感情深度' | '小谎言' | '财务诚实'
  difficulty: '温和' | '犀利' | '灵魂拷问'
  options: QuestionOption[]
}

export const QUESTIONS: Question[] = [
  {
    id: 1, text: '最近有没有偷偷喜欢过别人？', category: '忠诚度', difficulty: '温和',
    options: [
      { text: '完全没有，心里只有你', score: 90 },
      { text: '有点欣赏过某人，但不是喜欢', score: 65 },
      { text: '确实有点感觉，但没有行动', score: 35 },
      { text: '有，但我觉得这是正常的', score: 10 },
    ],
  },
  {
    id: 2, text: '昨天晚上你真的在加班吗？', category: '忠诚度', difficulty: '犀利',
    options: [
      { text: '是的，有同事可以作证', score: 90 },
      { text: '是的，但中间有短暂休息', score: 70 },
      { text: '不完全是，有点私人事情', score: 30 },
      { text: '没有完全在加班', score: 10 },
    ],
  },
  {
    id: 3, text: '你有没有和前任还保持联系？', category: '忠诚度', difficulty: '犀利',
    options: [
      { text: '完全没有，已经彻底断联了', score: 90 },
      { text: '只是偶尔看看朋友圈，不主动联系', score: 65 },
      { text: '有时会发消息，但就是普通朋友', score: 35 },
      { text: '联系比较频繁，但我觉得没问题', score: 10 },
    ],
  },
  {
    id: 4, text: '你爱我多一点还是喜欢别人多一点？', category: '感情深度', difficulty: '温和',
    options: [
      { text: '当然爱你，你是我最重要的人', score: 90 },
      { text: '爱你，但我们有时确实有矛盾', score: 70 },
      { text: '感情里我有时候有点迷茫', score: 35 },
      { text: '我需要时间想清楚', score: 10 },
    ],
  },
  {
    id: 5, text: '你真心觉得我很好看吗？', category: '感情深度', difficulty: '温和',
    options: [
      { text: '是的，我一直觉得你很好看', score: 90 },
      { text: '好看，但我更喜欢你的内在', score: 75 },
      { text: '还可以吧，各有特色', score: 40 },
      { text: '说实话外表不是最重要的', score: 15 },
    ],
  },
  {
    id: 6, text: '手机里有什么不想让我看的吗？', category: '手机隐私', difficulty: '犀利',
    options: [
      { text: '没有，随时可以看', score: 90 },
      { text: '有些私人内容，但不涉及感情', score: 60 },
      { text: '有一些不太方便看的内容', score: 30 },
      { text: '不想给你看，这是我的隐私', score: 10 },
    ],
  },
  {
    id: 7, text: '你有没有偷偷删除过聊天记录？', category: '手机隐私', difficulty: '犀利',
    options: [
      { text: '从来没有', score: 90 },
      { text: '偶尔整理手机删过，不是针对你', score: 60 },
      { text: '删过一些，觉得没必要留', score: 25 },
      { text: '删过，但有我自己的理由', score: 10 },
    ],
  },
  {
    id: 8, text: '你这个月花了多少钱在游戏上？', category: '财务诚实', difficulty: '温和',
    options: [
      { text: '没花，或者只是很少的体验费', score: 90 },
      { text: '花了一点，在合理范围内', score: 70 },
      { text: '花了不少，超出了预期', score: 35 },
      { text: '花了很多，但游戏是我的爱好', score: 10 },
    ],
  },
  {
    id: 9, text: '你有没有瞒着我借钱给别人？', category: '财务诚实', difficulty: '犀利',
    options: [
      { text: '没有，钱的事我都会和你商量', score: 90 },
      { text: '借过小额的，觉得不用打扰你', score: 55 },
      { text: '借过，当时不知道怎么开口', score: 25 },
      { text: '借过，这是我自己的事情', score: 10 },
    ],
  },
  {
    id: 10, text: '你真的打算和我结婚吗？', category: '感情深度', difficulty: '灵魂拷问',
    options: [
      { text: '是的，我是认真的，在认真考虑', score: 90 },
      { text: '有这个想法，但时机还不太成熟', score: 65 },
      { text: '感情还好，但婚姻需要再想想', score: 35 },
      { text: '暂时没想那么远', score: 10 },
    ],
  },
  {
    id: 11, text: '你有多爱我，1到10分打几分？', category: '感情深度', difficulty: '温和',
    options: [
      { text: '9-10分，你对我非常重要', score: 90 },
      { text: '7-8分，感情很好但还在深化', score: 70 },
      { text: '5-6分，还好，在磨合期', score: 35 },
      { text: '不好意思说分数', score: 10 },
    ],
  },
  {
    id: 12, text: '你有没有在我睡着后玩过手机超过2小时？', category: '手机隐私', difficulty: '温和',
    options: [
      { text: '没有，我很注重睡眠质量', score: 90 },
      { text: '偶尔，但不是经常', score: 65 },
      { text: '比较常见，睡前有用手机的习惯', score: 35 },
      { text: '有，但不觉得有什么问题', score: 10 },
    ],
  },
  {
    id: 13, text: '你有没有比较过我和别人？', category: '忠诚度', difficulty: '灵魂拷问',
    options: [
      { text: '没有，你在我心里是独一无二的', score: 90 },
      { text: '偶尔有客观对比，但不影响感情', score: 65 },
      { text: '有时会想到前任或别人', score: 30 },
      { text: '有比较，人之常情嘛', score: 10 },
    ],
  },
  {
    id: 14, text: '你有没有对我的朋友产生过特别的感觉？', category: '忠诚度', difficulty: '灵魂拷问',
    options: [
      { text: '没有，和你的朋友相处很正常', score: 90 },
      { text: '朋友很好相处，但只是朋友', score: 75 },
      { text: '有过一点点好感，但没超过友情', score: 30 },
      { text: '确实有一些特别的感觉', score: 5 },
    ],
  },
  {
    id: 15, text: '你有没有骗过我说"没事""随便""不饿"？', category: '小谎言', difficulty: '温和',
    options: [
      { text: '很少，我比较直接表达感受', score: 90 },
      { text: '偶尔为了不麻烦你这样说', score: 65 },
      { text: '比较经常，不想引起不必要的矛盾', score: 35 },
      { text: '经常这样，已经习惯了', score: 15 },
    ],
  },
  {
    id: 16, text: '你有没有假装喜欢我送的礼物？', category: '小谎言', difficulty: '温和',
    options: [
      { text: '没有，你送的我都真心喜欢', score: 90 },
      { text: '大部分都喜欢，偶尔会有点勉强', score: 65 },
      { text: '有几次不太喜欢，但没说出口', score: 35 },
      { text: '经常假装，不想让你失望', score: 10 },
    ],
  },
  {
    id: 17, text: '你有没有在我不知情的情况下退出过约会？', category: '小谎言', difficulty: '犀利',
    options: [
      { text: '没有，有事我会提前说', score: 90 },
      { text: '只有一次，临时有急事', score: 65 },
      { text: '发生过，当时觉得不好意思说', score: 30 },
      { text: '有过几次，找了借口', score: 10 },
    ],
  },
  {
    id: 18, text: '你有没有私下和异性有我不知道的约会？', category: '忠诚度', difficulty: '灵魂拷问',
    options: [
      { text: '绝对没有', score: 90 },
      { text: '有过和朋友的聚会，忘记提了', score: 55 },
      { text: '有过单独吃饭，觉得没必要汇报', score: 20 },
      { text: '有过，但我觉得只是朋友', score: 5 },
    ],
  },
  {
    id: 19, text: '你现在这段感情幸福吗？', category: '感情深度', difficulty: '温和',
    options: [
      { text: '非常幸福，和你在一起很满足', score: 90 },
      { text: '整体幸福，有些小问题在改善', score: 70 },
      { text: '有些迷茫，感情需要更多努力', score: 35 },
      { text: '说实话不确定，感情有些疲惫', score: 10 },
    ],
  },
  {
    id: 20, text: '如果可以重来，你还会选择我吗？', category: '感情深度', difficulty: '灵魂拷问',
    options: [
      { text: '一定会，你是我最好的选择', score: 90 },
      { text: '会的，虽然有过一些困难', score: 70 },
      { text: '不确定，如果能改变一些事情', score: 30 },
      { text: '说实话，需要认真考虑', score: 10 },
    ],
  },
]

export type Category = Question['category']
export type Difficulty = Question['difficulty']

export const CATEGORIES: Category[] = ['忠诚度', '手机隐私', '感情深度', '小谎言', '财务诚实']
export const DIFFICULTIES: Difficulty[] = ['温和', '犀利', '灵魂拷问']
