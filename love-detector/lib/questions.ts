export interface QuestionOption {
  text: string
  score: number // 0-100, higher = more honest/trustworthy
}

export interface Question {
  id: number
  text: string
  category: '忠诚度' | '手机隐私' | '感情深度' | '小谎言' | '财务诚实' | '社交边界' | '未来规划'
  difficulty: '温和' | '犀利' | '灵魂拷问'
  options: QuestionOption[]
}

export const QUESTIONS: Question[] = [
  // ===== 忠诚度 (10题) =====
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
    id: 4, text: '你有没有比较过我和别人？', category: '忠诚度', difficulty: '灵魂拷问',
    options: [
      { text: '没有，你在我心里是独一无二的', score: 90 },
      { text: '偶尔有客观对比，但不影响感情', score: 65 },
      { text: '有时会想到前任或别人', score: 30 },
      { text: '有比较，人之常情嘛', score: 10 },
    ],
  },
  {
    id: 5, text: '你有没有对我的朋友产生过特别的感觉？', category: '忠诚度', difficulty: '灵魂拷问',
    options: [
      { text: '没有，和你的朋友相处很正常', score: 90 },
      { text: '朋友很好相处，但只是朋友', score: 75 },
      { text: '有过一点点好感，但没超过友情', score: 30 },
      { text: '确实有一些特别的感觉', score: 5 },
    ],
  },
  {
    id: 6, text: '你有没有私下和异性有我不知道的约会？', category: '忠诚度', difficulty: '灵魂拷问',
    options: [
      { text: '绝对没有', score: 90 },
      { text: '有过和朋友的聚会，忘记提了', score: 55 },
      { text: '有过单独吃饭，觉得没必要汇报', score: 20 },
      { text: '有过，但我觉得只是朋友', score: 5 },
    ],
  },
  {
    id: 7, text: '出差或旅行时，有没有发生过让你心虚的事？', category: '忠诚度', difficulty: '灵魂拷问',
    options: [
      { text: '完全没有，出门在外更想你', score: 90 },
      { text: '没什么特别的，就是正常社交', score: 65 },
      { text: '有些事说不上心虚，但不太好解释', score: 25 },
      { text: '有一些，但已经过去了', score: 5 },
    ],
  },
  {
    id: 8, text: '你有没有因为别人对你示好而犹豫过？', category: '忠诚度', difficulty: '犀利',
    options: [
      { text: '从来没有，我会直接拒绝', score: 90 },
      { text: '有人示好过，但我没放在心上', score: 70 },
      { text: '有过一瞬间的犹豫，但理智战胜了', score: 35 },
      { text: '确实犹豫过，感情的事很复杂', score: 10 },
    ],
  },
  {
    id: 9, text: '你会不会在我不知道的情况下和异性深夜聊天？', category: '忠诚度', difficulty: '犀利',
    options: [
      { text: '不会，深夜只和你聊天', score: 90 },
      { text: '偶尔有工作消息，不是聊天', score: 65 },
      { text: '有时会，但聊的都是正经事', score: 30 },
      { text: '会，但只是普通朋友间的交流', score: 10 },
    ],
  },
  {
    id: 10, text: '你的社交媒体上有没有关注让你心动的人？', category: '忠诚度', difficulty: '温和',
    options: [
      { text: '没有，关注的都是普通朋友和博主', score: 90 },
      { text: '有关注一些好看的博主，但纯欣赏', score: 65 },
      { text: '有几个人确实挺吸引我的', score: 30 },
      { text: '有，但关注不代表什么', score: 10 },
    ],
  },

  // ===== 手机隐私 (7题) =====
  {
    id: 11, text: '手机里有什么不想让我看的吗？', category: '手机隐私', difficulty: '犀利',
    options: [
      { text: '没有，随时可以看', score: 90 },
      { text: '有些私人内容，但不涉及感情', score: 60 },
      { text: '有一些不太方便看的内容', score: 30 },
      { text: '不想给你看，这是我的隐私', score: 10 },
    ],
  },
  {
    id: 12, text: '你有没有偷偷删除过聊天记录？', category: '手机隐私', difficulty: '犀利',
    options: [
      { text: '从来没有', score: 90 },
      { text: '偶尔整理手机删过，不是针对你', score: 60 },
      { text: '删过一些，觉得没必要留', score: 25 },
      { text: '删过，但有我自己的理由', score: 10 },
    ],
  },
  {
    id: 13, text: '你有没有在我睡着后玩过手机超过2小时？', category: '手机隐私', difficulty: '温和',
    options: [
      { text: '没有，我很注重睡眠质量', score: 90 },
      { text: '偶尔，但不是经常', score: 65 },
      { text: '比较常见，睡前有用手机的习惯', score: 35 },
      { text: '有，但不觉得有什么问题', score: 10 },
    ],
  },
  {
    id: 14, text: '你手机有没有设置我不知道的密码或隐藏相册？', category: '手机隐私', difficulty: '犀利',
    options: [
      { text: '没有，密码你都知道', score: 90 },
      { text: '有密码但不是为了防你', score: 55 },
      { text: '有隐藏相册，但不是什么敏感内容', score: 25 },
      { text: '有，每个人都需要隐私空间', score: 10 },
    ],
  },
  {
    id: 15, text: '你有没有用过小号或者马甲账号？', category: '手机隐私', difficulty: '犀利',
    options: [
      { text: '没有，我就一个账号', score: 90 },
      { text: '有小号，但是用来看段子的', score: 60 },
      { text: '有，偶尔想匿名发点东西', score: 30 },
      { text: '有，但这是我的自由', score: 10 },
    ],
  },
  {
    id: 16, text: '你接电话的时候有没有特意避开我？', category: '手机隐私', difficulty: '犀利',
    options: [
      { text: '没有，我接电话很自然', score: 90 },
      { text: '有时候是工作电话需要安静', score: 65 },
      { text: '偶尔会走开，但不是每次', score: 30 },
      { text: '有些电话确实不方便当面接', score: 10 },
    ],
  },
  {
    id: 17, text: '你有没有偷看过我的手机？', category: '手机隐私', difficulty: '温和',
    options: [
      { text: '从来没有，我尊重你的隐私', score: 90 },
      { text: '不小心看到过消息通知', score: 65 },
      { text: '好奇的时候翻过', score: 30 },
      { text: '看过，但也没发现什么', score: 15 },
    ],
  },

  // ===== 感情深度 (10题) =====
  {
    id: 18, text: '你爱我多一点还是喜欢别人多一点？', category: '感情深度', difficulty: '温和',
    options: [
      { text: '当然爱你，你是我最重要的人', score: 90 },
      { text: '爱你，但我们有时确实有矛盾', score: 70 },
      { text: '感情里我有时候有点迷茫', score: 35 },
      { text: '我需要时间想清楚', score: 10 },
    ],
  },
  {
    id: 19, text: '你真心觉得我很好看吗？', category: '感情深度', difficulty: '温和',
    options: [
      { text: '是的，我一直觉得你很好看', score: 90 },
      { text: '好看，但我更喜欢你的内在', score: 75 },
      { text: '还可以吧，各有特色', score: 40 },
      { text: '说实话外表不是最重要的', score: 15 },
    ],
  },
  {
    id: 20, text: '你真的打算和我结婚吗？', category: '感情深度', difficulty: '灵魂拷问',
    options: [
      { text: '是的，我是认真的，在认真考虑', score: 90 },
      { text: '有这个想法，但时机还不太成熟', score: 65 },
      { text: '感情还好，但婚姻需要再想想', score: 35 },
      { text: '暂时没想那么远', score: 10 },
    ],
  },
  {
    id: 21, text: '你有多爱我，1到10分打几分？', category: '感情深度', difficulty: '温和',
    options: [
      { text: '9-10分，你对我非常重要', score: 90 },
      { text: '7-8分，感情很好但还在深化', score: 70 },
      { text: '5-6分，还好，在磨合期', score: 35 },
      { text: '不好意思说分数', score: 10 },
    ],
  },
  {
    id: 22, text: '你现在这段感情幸福吗？', category: '感情深度', difficulty: '温和',
    options: [
      { text: '非常幸福，和你在一起很满足', score: 90 },
      { text: '整体幸福，有些小问题在改善', score: 70 },
      { text: '有些迷茫，感情需要更多努力', score: 35 },
      { text: '说实话不确定，感情有些疲惫', score: 10 },
    ],
  },
  {
    id: 23, text: '如果可以重来，你还会选择我吗？', category: '感情深度', difficulty: '灵魂拷问',
    options: [
      { text: '一定会，你是我最好的选择', score: 90 },
      { text: '会的，虽然有过一些困难', score: 70 },
      { text: '不确定，如果能改变一些事情', score: 30 },
      { text: '说实话，需要认真考虑', score: 10 },
    ],
  },
  {
    id: 24, text: '你有没有想过和我分手？', category: '感情深度', difficulty: '灵魂拷问',
    options: [
      { text: '从来没有，我很珍惜我们', score: 90 },
      { text: '吵架的时候闪过念头，但很快就没了', score: 60 },
      { text: '认真想过，但还是决定继续', score: 25 },
      { text: '想过不止一次', score: 5 },
    ],
  },
  {
    id: 25, text: '你觉得我们之间最大的问题是什么？', category: '感情深度', difficulty: '犀利',
    options: [
      { text: '没什么大问题，小事都能解决', score: 90 },
      { text: '沟通有时不够顺畅', score: 65 },
      { text: '有些根本性的分歧需要面对', score: 30 },
      { text: '问题太多了，不知道从哪说起', score: 10 },
    ],
  },
  {
    id: 26, text: '你会为了我改变自己吗？', category: '感情深度', difficulty: '犀利',
    options: [
      { text: '愿意，你值得我变得更好', score: 90 },
      { text: '可以适当调整，但不会完全改变', score: 70 },
      { text: '我觉得不应该为别人改变自己', score: 35 },
      { text: '改变很难，我可能做不到', score: 15 },
    ],
  },
  {
    id: 27, text: '你有没有在背后和朋友吐槽过我？', category: '感情深度', difficulty: '温和',
    options: [
      { text: '没有，有什么话我当面说', score: 90 },
      { text: '偶尔聊起来会说几句，但不是吐槽', score: 65 },
      { text: '有时候需要朋友帮我分析一下', score: 35 },
      { text: '说过不少，需要发泄', score: 10 },
    ],
  },

  // ===== 小谎言 (7题) =====
  {
    id: 28, text: '你有没有骗过我说"没事""随便""不饿"？', category: '小谎言', difficulty: '温和',
    options: [
      { text: '很少，我比较直接表达感受', score: 90 },
      { text: '偶尔为了不麻烦你这样说', score: 65 },
      { text: '比较经常，不想引起不必要的矛盾', score: 35 },
      { text: '经常这样，已经习惯了', score: 15 },
    ],
  },
  {
    id: 29, text: '你有没有假装喜欢我送的礼物？', category: '小谎言', difficulty: '温和',
    options: [
      { text: '没有，你送的我都真心喜欢', score: 90 },
      { text: '大部分都喜欢，偶尔会有点勉强', score: 65 },
      { text: '有几次不太喜欢，但没说出口', score: 35 },
      { text: '经常假装，不想让你失望', score: 10 },
    ],
  },
  {
    id: 30, text: '你有没有在我不知情的情况下取消过约会？', category: '小谎言', difficulty: '犀利',
    options: [
      { text: '没有，有事我会提前说', score: 90 },
      { text: '只有一次，临时有急事', score: 65 },
      { text: '发生过，当时觉得不好意思说', score: 30 },
      { text: '有过几次，找了借口', score: 10 },
    ],
  },
  {
    id: 31, text: '你有没有夸大过自己的收入或成就？', category: '小谎言', difficulty: '犀利',
    options: [
      { text: '没有，我很真实', score: 90 },
      { text: '稍微美化过，但差距不大', score: 60 },
      { text: '有过一些夸大的说法', score: 30 },
      { text: '是的，我想给你留好印象', score: 10 },
    ],
  },
  {
    id: 32, text: '你说"马上到"的时候真的马上到了吗？', category: '小谎言', difficulty: '温和',
    options: [
      { text: '基本是的，我很守时', score: 90 },
      { text: '可能还差五分钟的样子', score: 70 },
      { text: '一般还要十几分钟', score: 35 },
      { text: '说实话可能还没出门', score: 10 },
    ],
  },
  {
    id: 33, text: '你有没有假装没看到我的消息？', category: '小谎言', difficulty: '温和',
    options: [
      { text: '没有，看到就回', score: 90 },
      { text: '偶尔忙的时候确实没及时看到', score: 70 },
      { text: '有时候看到了但想晚点回', score: 35 },
      { text: '有时候就是不想回', score: 10 },
    ],
  },
  {
    id: 34, text: '你有没有编造过不存在的理由拒绝我的邀请？', category: '小谎言', difficulty: '犀利',
    options: [
      { text: '没有，不想去我会直接说', score: 90 },
      { text: '偶尔说有事，但其实就是想休息', score: 60 },
      { text: '有过几次，不想伤你面子', score: 30 },
      { text: '比较常见，有时真的需要独处', score: 15 },
    ],
  },

  // ===== 财务诚实 (5题) =====
  {
    id: 35, text: '你这个月花了多少钱在游戏/购物上？', category: '财务诚实', difficulty: '温和',
    options: [
      { text: '没花，或者只是很少的体验费', score: 90 },
      { text: '花了一点，在合理范围内', score: 70 },
      { text: '花了不少，超出了预期', score: 35 },
      { text: '花了很多，但这是我的爱好', score: 10 },
    ],
  },
  {
    id: 36, text: '你有没有瞒着我借钱给别人？', category: '财务诚实', difficulty: '犀利',
    options: [
      { text: '没有，钱的事我都会和你商量', score: 90 },
      { text: '借过小额的，觉得不用打扰你', score: 55 },
      { text: '借过，当时不知道怎么开口', score: 25 },
      { text: '借过，这是我自己的事情', score: 10 },
    ],
  },
  {
    id: 37, text: '你有没有藏过私房钱？', category: '财务诚实', difficulty: '犀利',
    options: [
      { text: '没有，我们的钱是透明的', score: 90 },
      { text: '有一点应急的，但金额很小', score: 60 },
      { text: '有，但是为了以防万一', score: 30 },
      { text: '有，而且金额不少', score: 10 },
    ],
  },
  {
    id: 38, text: '你有没有隐瞒过自己的负债情况？', category: '财务诚实', difficulty: '灵魂拷问',
    options: [
      { text: '没有负债，财务状况你都清楚', score: 90 },
      { text: '有信用卡分期，但在可控范围', score: 60 },
      { text: '有一些负债没有完全告诉你', score: 25 },
      { text: '负债比你知道的多不少', score: 5 },
    ],
  },
  {
    id: 39, text: '你买的东西有没有跟我说的价格不一样？', category: '财务诚实', difficulty: '温和',
    options: [
      { text: '没有，我买东西很透明', score: 90 },
      { text: '偶尔少报一点，怕你觉得贵', score: 65 },
      { text: '经常把价格说低一些', score: 30 },
      { text: '报价和实际差距挺大的', score: 10 },
    ],
  },

  // ===== 社交边界 (6题) =====
  {
    id: 40, text: '你有没有和异性同事走得特别近？', category: '社交边界', difficulty: '犀利',
    options: [
      { text: '没有，和同事保持正常距离', score: 90 },
      { text: '有关系好的，但纯粹是工作伙伴', score: 65 },
      { text: '有一两个比较亲近，但没有越界', score: 30 },
      { text: '确实有，但觉得没什么', score: 10 },
    ],
  },
  {
    id: 41, text: '你会不会把我们吵架的事告诉别人？', category: '社交边界', difficulty: '温和',
    options: [
      { text: '不会，我们的事我不会说', score: 90 },
      { text: '只和最好的朋友说过', score: 65 },
      { text: '会和朋友聊，需要别人的建议', score: 35 },
      { text: '说过不少，需要倾诉', score: 10 },
    ],
  },
  {
    id: 42, text: '你有没有参加过我不知道的聚会或活动？', category: '社交边界', difficulty: '犀利',
    options: [
      { text: '没有，有活动我都会跟你说', score: 90 },
      { text: '偶尔临时的聚会忘了提', score: 60 },
      { text: '有过一些，当时觉得不需要报备', score: 30 },
      { text: '不少，我不觉得事事都要说', score: 10 },
    ],
  },
  {
    id: 43, text: '你朋友圈有没有设置分组可见对我屏蔽？', category: '社交边界', difficulty: '犀利',
    options: [
      { text: '没有，你能看到我所有动态', score: 90 },
      { text: '有分组但你在可见名单里', score: 65 },
      { text: '有些内容确实没让你看到', score: 25 },
      { text: '有不少是屏蔽你的', score: 5 },
    ],
  },
  {
    id: 44, text: '你有没有故意在社交媒体上和别人暧昧互动？', category: '社交边界', difficulty: '灵魂拷问',
    options: [
      { text: '从来没有', score: 90 },
      { text: '可能无意间有过亲密的评论', score: 60 },
      { text: '偶尔会，但觉得只是玩笑', score: 25 },
      { text: '有过，但不代表什么', score: 5 },
    ],
  },
  {
    id: 45, text: '你有没有和别人说过"我单身"？', category: '社交边界', difficulty: '灵魂拷问',
    options: [
      { text: '从来没有，我会说我有对象', score: 90 },
      { text: '没有主动说过，但也没主动提', score: 55 },
      { text: '有过一次，当时是特殊情况', score: 20 },
      { text: '说过，当时有我的理由', score: 5 },
    ],
  },

  // ===== 未来规划 (5题) =====
  {
    id: 46, text: '你的未来规划里有没有我的位置？', category: '未来规划', difficulty: '灵魂拷问',
    options: [
      { text: '当然有，我们一起规划未来', score: 90 },
      { text: '有的，但具体的还需要慢慢讨论', score: 70 },
      { text: '还没想那么清楚', score: 30 },
      { text: '目前主要在想自己的事', score: 10 },
    ],
  },
  {
    id: 47, text: '如果有更好的工作机会但要异地，你会怎么选？', category: '未来规划', difficulty: '灵魂拷问',
    options: [
      { text: '会和你商量，一起做决定', score: 90 },
      { text: '会优先考虑不影响我们的关系', score: 70 },
      { text: '可能会选工作，但会努力维持', score: 30 },
      { text: '事业很重要，可能会选工作', score: 10 },
    ],
  },
  {
    id: 48, text: '你有没有偷偷考虑过移民或去远方发展？', category: '未来规划', difficulty: '犀利',
    options: [
      { text: '没有，我很满意现在的状态', score: 90 },
      { text: '有过一些想法，但会和你商量', score: 65 },
      { text: '认真想过，但还没下定决心', score: 30 },
      { text: '有这个打算，但还没说', score: 10 },
    ],
  },
  {
    id: 49, text: '你有没有考虑过要不要和我一起买房？', category: '未来规划', difficulty: '犀利',
    options: [
      { text: '有，已经在看了或者愿意一起', score: 90 },
      { text: '有这个想法但觉得时机还不到', score: 65 },
      { text: '对这件事有些顾虑', score: 30 },
      { text: '没怎么想过这个', score: 10 },
    ],
  },
  {
    id: 50, text: '十年后你觉得我们还会在一起吗？', category: '未来规划', difficulty: '灵魂拷问',
    options: [
      { text: '一定会，我对我们很有信心', score: 90 },
      { text: '希望会，但感情的事很难说', score: 65 },
      { text: '不确定，要看我们怎么经营', score: 30 },
      { text: '说实话，很难预测', score: 10 },
    ],
  },
]

export type Category = Question['category']
export type Difficulty = Question['difficulty']

export const CATEGORIES: Category[] = ['忠诚度', '手机隐私', '感情深度', '小谎言', '财务诚实', '社交边界', '未来规划']
export const DIFFICULTIES: Difficulty[] = ['温和', '犀利', '灵魂拷问']
