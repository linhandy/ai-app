export interface Question {
  id: number
  text: string
  instruction: string
  category: '忠诚度' | '手机隐私' | '感情深度' | '小谎言' | '财务诚实'
  difficulty: '温和' | '犀利' | '灵魂拷问'
}

export const QUESTIONS: Question[] = [
  { id: 1, text: '最近有没有偷偷喜欢过别人？', instruction: '请让对方深呼吸后大声回答', category: '忠诚度', difficulty: '温和' },
  { id: 2, text: '昨天晚上你真的在加班吗？', instruction: '请让对方保持平静语气回答', category: '忠诚度', difficulty: '犀利' },
  { id: 3, text: '你有没有和前任还保持联系？', instruction: '请让对方看着镜头回答', category: '忠诚度', difficulty: '犀利' },
  { id: 4, text: '你爱我多一点还是喜欢别人多一点？', instruction: '请让对方保持眼神接触', category: '感情深度', difficulty: '温和' },
  { id: 5, text: '你真心觉得我很好看吗？', instruction: '不允许回答"还行/不错"', category: '感情深度', difficulty: '温和' },
  { id: 6, text: '手机里有什么不想让我看的吗？', instruction: '请让对方深吸一口气再回答', category: '手机隐私', difficulty: '犀利' },
  { id: 7, text: '你有没有偷偷删除过聊天记录？', instruction: '请让对方注视你的眼睛', category: '手机隐私', difficulty: '犀利' },
  { id: 8, text: '你这个月花了多少钱在游戏上？', instruction: '请让对方如实回答具体金额', category: '财务诚实', difficulty: '温和' },
  { id: 9, text: '你有没有瞒着我借钱给别人？', instruction: '请让对方冷静后回答', category: '财务诚实', difficulty: '犀利' },
  { id: 10, text: '你真的打算和我结婚吗？', instruction: '深呼吸，认真回答', category: '感情深度', difficulty: '灵魂拷问' },
  { id: 11, text: '你有多爱我，1到10分打几分？', instruction: '1秒内必须回答', category: '感情深度', difficulty: '温和' },
  { id: 12, text: '你有没有在我睡着后玩过手机超过2小时？', instruction: '请据实回答', category: '手机隐私', difficulty: '温和' },
  { id: 13, text: '你有没有比较过我和别人？', instruction: '请让对方放松后回答', category: '忠诚度', difficulty: '灵魂拷问' },
  { id: 14, text: '你有没有对我的朋友产生过特别的感觉？', instruction: '请深吸一口气，诚实回答', category: '忠诚度', difficulty: '灵魂拷问' },
  { id: 15, text: '你有没有骗过我说"没事""随便""不饿"？', instruction: '请坦诚回答', category: '小谎言', difficulty: '温和' },
  { id: 16, text: '你有没有假装喜欢我送的礼物？', instruction: '请如实回答', category: '小谎言', difficulty: '温和' },
  { id: 17, text: '你有没有在我不知情的情况下退出过约会？', instruction: '请认真回答', category: '小谎言', difficulty: '犀利' },
  { id: 18, text: '你有没有私下和异性有我不知道的约会？', instruction: '请正视我的眼睛回答', category: '忠诚度', difficulty: '灵魂拷问' },
  { id: 19, text: '你现在这段感情幸福吗？', instruction: '请停顿3秒再回答', category: '感情深度', difficulty: '温和' },
  { id: 20, text: '如果可以重来，你还会选择我吗？', instruction: '请认真思考后回答', category: '感情深度', difficulty: '灵魂拷问' },
]

export type Category = Question['category']
export type Difficulty = Question['difficulty']

export const CATEGORIES: Category[] = ['忠诚度', '手机隐私', '感情深度', '小谎言', '财务诚实']
export const DIFFICULTIES: Difficulty[] = ['温和', '犀利', '灵魂拷问']
