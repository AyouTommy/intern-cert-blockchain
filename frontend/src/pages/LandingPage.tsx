import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useRef } from 'react'
import { useAuthStore } from '../stores/authStore'

/* ───────── 动画辅助 Hook ───────── */
function useScrollAnimation() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })
  return { ref, isInView }
}

/* ───────── 数据 ───────── */
const painPoints = [
  {
    icon: '📄',
    title: '易伪造',
    desc: '纸质实习证明可被轻易伪造，篡改实习日期、工作内容、评价等关键信息，无法有效辨别真伪',
    color: 'from-red-500/20 to-rose-500/20 border-red-500/30',
  },
  {
    icon: '🔍',
    title: '难核验',
    desc: '用人单位需联系原实习企业或高校人工核实，流程繁琐耗时数天，甚至无法取得有效回复',
    color: 'from-amber-500/20 to-orange-500/20 border-amber-500/30',
  },
  {
    icon: '✍️',
    title: '缺公信',
    desc: '传统证明仅由企业或高校单方签发，缺乏多方协同背书机制，公信力和可信度不足',
    color: 'from-yellow-500/20 to-amber-500/20 border-yellow-500/30',
  },
  {
    icon: '💔',
    title: '易丢失',
    desc: '纸质原件丢失后难以补办，且没有可靠的电子化备份与长期存储渠道',
    color: 'from-violet-500/20 to-purple-500/20 border-violet-500/30',
  },
]

const processSteps = [
  {
    step: '01',
    title: '学生发起申请',
    desc: '学生在系统中填写实习信息，选择实习岗位，提交实习证明申请',
    icon: '📝',
  },
  {
    step: '02',
    title: '多方协同确认',
    desc: '高校审核 + 企业评价，双方使用 EIP-712 标准进行独立数字签名确认',
    icon: '🤝',
  },
  {
    step: '03',
    title: '证书上链存证',
    desc: '证明信息写入以太坊区块链，PDF 证书自动上传至 IPFS 去中心化存储',
    icon: '⛓️',
  },
  {
    step: '04',
    title: '去中心化核验',
    desc: '任何人可通过证书编号或二维码实时验证证明真伪，无需联系签发方',
    icon: '✅',
  },
]

const roleCards = [
  { icon: '🎓', title: '学生', features: ['发起实习申请', '查看链上证书', '个人实习履历', '证书分享传播'] },
  { icon: '🏛️', title: '高校管理员', features: ['审核实习证明', '链上数字签名', '学生白名单管理', '撤销工作流'] },
  { icon: '🏢', title: '企业用户', features: ['岗位管理发布', '多维度评价', '链上签名确认', '实习生管理'] },
  { icon: '🔍', title: '第三方机构', features: ['单个/批量核验', '卡片式核验报告', '核验记录面板', '真伪即时识别'] },
  { icon: '👨‍💼', title: '系统管理员', features: ['用户机构审核', '区块链运维', '全局数据统计', '系统安全管理'] },
]

const techStack = [
  {
    category: '前端层',
    color: 'from-blue-500/20 to-cyan-500/20',
    items: [
      { name: 'React 18', desc: '组件化 UI 框架' },
      { name: 'TypeScript', desc: '类型安全' },
      { name: 'Vite', desc: '极速构建工具' },
      { name: 'Framer Motion', desc: '流畅动画引擎' },
      { name: 'Socket.IO Client', desc: '实时状态推送' },
    ],
  },
  {
    category: '后端层',
    color: 'from-emerald-500/20 to-teal-500/20',
    items: [
      { name: 'Node.js + Express', desc: 'RESTful API 服务' },
      { name: 'Prisma ORM', desc: '类型安全数据访问' },
      { name: 'ethers.js v6', desc: '区块链交互' },
      { name: 'Socket.IO Server', desc: '实时事件推送' },
      { name: 'PDFKit', desc: '证书 PDF 生成' },
    ],
  },
  {
    category: '区块链与存储层',
    color: 'from-violet-500/20 to-purple-500/20',
    items: [
      { name: 'Solidity 0.8.19', desc: '智能合约开发' },
      { name: 'Ethereum Sepolia', desc: '测试网部署' },
      { name: 'IPFS (Pinata)', desc: '去中心化文件存储' },
      { name: 'PostgreSQL (Neon)', desc: '云端关系型数据库' },
      { name: 'Alchemy WebSocket', desc: '链上事件实时监听' },
    ],
  },
  {
    category: '安全层',
    color: 'from-rose-500/20 to-pink-500/20',
    items: [
      { name: 'EIP-712', desc: '结构化数字签名' },
      { name: 'AES-256-GCM', desc: '机构密钥加密' },
      { name: 'JWT + bcrypt', desc: '身份认证与密码哈希' },
      { name: 'AccessControl', desc: '链上角色权限' },
      { name: 'ReentrancyGuard', desc: '合约重入防护' },
    ],
  },
]

/* ───────── 主组件 ───────── */
export default function LandingPage() {
  const { isAuthenticated } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true })
    }
  }, [isAuthenticated, navigate])

  const hero = useScrollAnimation()
  const pain = useScrollAnimation()
  const process = useScrollAnimation()
  const roles = useScrollAnimation()
  const tech = useScrollAnimation()
  const cta = useScrollAnimation()

  return (
    <div className="min-h-screen bg-dark-900 text-dark-100">
      {/* ═══ 导航栏 ═══ */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-dark-900/80 backdrop-blur-xl border-b border-dark-800/50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <span className="text-lg font-display font-bold">链证通</span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm text-dark-400">
            <a href="#pain-points" className="hover:text-dark-100 transition-colors">痛点分析</a>
            <a href="#process" className="hover:text-dark-100 transition-colors">解决方案</a>
            <a href="#roles" className="hover:text-dark-100 transition-colors">系统角色</a>
            <a href="#tech" className="hover:text-dark-100 transition-colors">技术架构</a>
          </div>

          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm text-dark-300 hover:text-dark-100 transition-colors px-4 py-2">
              登录
            </Link>
            <Link to="/register" className="text-sm bg-primary-500 hover:bg-primary-600 text-white px-5 py-2 rounded-lg transition-colors font-medium">
              注册
            </Link>
          </div>
        </div>
      </nav>

      {/* ═══ Hero ═══ */}
      <section ref={hero.ref} className="relative min-h-screen flex items-center justify-center pt-16 overflow-hidden">
        {/* 背景动效 */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-primary-600/5 via-transparent to-accent-500/5" />
          <motion.div
            animate={{ scale: [1, 1.3, 1], rotate: [0, 180, 360] }}
            transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
            className="absolute top-1/4 -left-20 w-96 h-96 bg-primary-500/8 rounded-full blur-3xl"
          />
          <motion.div
            animate={{ scale: [1.2, 1, 1.2], rotate: [180, 0, 180] }}
            transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
            className="absolute bottom-1/4 -right-20 w-80 h-80 bg-accent-500/8 rounded-full blur-3xl"
          />
          {/* 网格 */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
              backgroundSize: '60px 60px',
            }}
          />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={hero.isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="relative z-10 text-center px-6 max-w-4xl"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-500/10 border border-primary-500/20 mb-8"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-sm text-primary-300">基于以太坊 Sepolia 测试网运行</span>
          </motion.div>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold leading-tight mb-6">
            高校实习证明
            <br />
            <span className="bg-gradient-to-r from-primary-400 via-accent-400 to-primary-400 bg-clip-text text-transparent">
              区块链上链系统
            </span>
          </h1>

          <p className="text-lg md:text-xl text-dark-300 max-w-2xl mx-auto mb-10 leading-relaxed">
            基于以太坊区块链技术，实现实习证明的不可篡改存储、
            多方协同数字签名与去中心化核验，为高校、企业、学生
            提供可信的数字凭证服务
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/register"
              className="px-8 py-3.5 bg-gradient-to-r from-primary-500 to-accent-500 hover:from-primary-600 hover:to-accent-600 text-white rounded-xl font-semibold transition-all shadow-neon hover:shadow-neon-strong text-base"
            >
              立即体验 →
            </Link>
            <a
              href="#pain-points"
              className="px-8 py-3.5 border border-dark-600 hover:border-dark-500 text-dark-300 hover:text-dark-100 rounded-xl font-medium transition-all text-base"
            >
              了解更多 ↓
            </a>
          </div>
        </motion.div>

        {/* 底部浮动方块 */}
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex gap-3">
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              animate={{ y: [0, -12, 0] }}
              transition={{ duration: 2, repeat: Infinity, delay: i * 0.2 }}
              className="w-3 h-3 rounded bg-gradient-to-br from-primary-400/60 to-accent-400/60"
            />
          ))}
        </div>
      </section>

      {/* ═══ 痛点 ═══ */}
      <section id="pain-points" ref={pain.ref} className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={pain.isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
              传统实习证明的<span className="text-red-400">痛点</span>
            </h2>
            <p className="text-dark-400 max-w-2xl mx-auto">
              纸质实习证明在签发、核验、存储等环节存在诸多问题，亟需一种安全、可信、高效的数字化解决方案
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {painPoints.map((p, i) => (
              <motion.div
                key={p.title}
                initial={{ opacity: 0, y: 30 }}
                animate={pain.isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className={`p-6 rounded-2xl bg-gradient-to-br ${p.color} border hover:scale-[1.02] transition-transform`}
              >
                <span className="text-3xl block mb-3">{p.icon}</span>
                <h3 className="text-lg font-semibold mb-2 text-dark-100">{p.title}</h3>
                <p className="text-sm text-dark-400 leading-relaxed">{p.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ 解决方案流程 ═══ */}
      <section id="process" ref={process.ref} className="py-24 px-6 bg-dark-800/30">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={process.isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
              我们的<span className="text-primary-400">解决方案</span>
            </h2>
            <p className="text-dark-400 max-w-2xl mx-auto">
              通过区块链技术构建完整的实习证明全生命周期管理流程，从申请到核验全程链上可追溯
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {processSteps.map((s, i) => (
              <motion.div
                key={s.step}
                initial={{ opacity: 0, y: 30 }}
                animate={process.isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: i * 0.15, duration: 0.5 }}
                className="relative"
              >
                <div className="glass-card p-6 h-full hover:border-primary-500/30 transition-all">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-3xl">{s.icon}</span>
                    <span className="text-xs font-mono text-primary-400 bg-primary-500/10 px-2 py-0.5 rounded">
                      STEP {s.step}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-dark-100 mb-2">{s.title}</h3>
                  <p className="text-sm text-dark-400 leading-relaxed">{s.desc}</p>
                </div>
                {/* 连接箭头 */}
                {i < processSteps.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-3 transform -translate-y-1/2 text-dark-600 z-10">
                    →
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ 五大角色 ═══ */}
      <section id="roles" ref={roles.ref} className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={roles.isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
              五大角色 · <span className="text-accent-400">各司其职</span>
            </h2>
            <p className="text-dark-400 max-w-2xl mx-auto">
              系统围绕实习证明的完整生命周期，为五类用户提供差异化的功能与权限
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-4">
            {roleCards.map((r, i) => (
              <motion.div
                key={r.title}
                initial={{ opacity: 0, y: 20 }}
                animate={roles.isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: i * 0.08, duration: 0.5 }}
                className="glass-card p-5 hover:border-primary-500/30 hover:scale-[1.03] transition-all text-center"
              >
                <span className="text-4xl block mb-3">{r.icon}</span>
                <h3 className="text-base font-semibold text-dark-100 mb-3">{r.title}</h3>
                <ul className="space-y-1.5">
                  {r.features.map(f => (
                    <li key={f} className="text-xs text-dark-400 flex items-center gap-1.5 justify-center">
                      <span className="w-1 h-1 rounded-full bg-primary-500/50" />
                      {f}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ 技术架构 ═══ */}
      <section id="tech" ref={tech.ref} className="py-24 px-6 bg-dark-800/30">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={tech.isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
              核心<span className="text-violet-400">技术架构</span>
            </h2>
            <p className="text-dark-400 max-w-2xl mx-auto">
              采用前后端分离 + 区块链混合架构，四层技术体系保障系统安全性、可靠性与可扩展性
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6">
            {techStack.map((layer, i) => (
              <motion.div
                key={layer.category}
                initial={{ opacity: 0, y: 20 }}
                animate={tech.isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className={`p-6 rounded-2xl bg-gradient-to-br ${layer.color} border border-dark-700/50`}
              >
                <h3 className="text-base font-semibold text-dark-100 mb-4">{layer.category}</h3>
                <div className="space-y-2.5">
                  {layer.items.map(item => (
                    <div key={item.name} className="flex items-center justify-between">
                      <span className="text-sm font-mono text-dark-200">{item.name}</span>
                      <span className="text-xs text-dark-500">{item.desc}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>

          {/* 部署架构 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={tech.isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="mt-8 p-6 rounded-2xl border border-dark-700/50 bg-dark-800/40"
          >
            <h3 className="text-base font-semibold text-dark-100 mb-4 text-center">部署架构</h3>
            <div className="flex flex-wrap justify-center gap-4">
              {[
                { name: 'Vercel', desc: '前端 CDN 部署', icon: '▲' },
                { name: 'Render', desc: '后端 Node.js', icon: '⚡' },
                { name: 'Neon', desc: 'PostgreSQL 云数据库', icon: '🐘' },
                { name: 'Sepolia', desc: '以太坊测试网', icon: '⟠' },
                { name: 'Pinata', desc: 'IPFS 网关服务', icon: '📦' },
              ].map(d => (
                <div key={d.name} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-dark-700/40 border border-dark-700/50">
                  <span className="text-base">{d.icon}</span>
                  <div>
                    <p className="text-xs font-semibold text-dark-200">{d.name}</p>
                    <p className="text-xs text-dark-500">{d.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section ref={cta.ref} className="py-24 px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={cta.isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="max-w-3xl mx-auto text-center"
        >
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
            准备好了吗？
          </h2>
          <p className="text-dark-400 mb-8 text-lg">
            立即加入高校实习证明区块链上链平台，体验安全、可信、高效的数字化实习证明管理
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/register"
              className="px-10 py-4 bg-gradient-to-r from-primary-500 to-accent-500 hover:from-primary-600 hover:to-accent-600 text-white rounded-xl font-semibold transition-all shadow-neon hover:shadow-neon-strong text-base"
            >
              立即注册 →
            </Link>
            <Link
              to="/login"
              className="px-10 py-4 border border-dark-600 hover:border-dark-500 text-dark-300 hover:text-dark-100 rounded-xl font-medium transition-all text-base"
            >
              登录系统
            </Link>
          </div>
        </motion.div>
      </section>

      {/* ═══ Footer ═══ */}
      <footer className="border-t border-dark-800/50 py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <span className="text-sm text-dark-400">© 2026 链证通 · 高校实习证明区块链上链系统</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-dark-500">
            <a
              href="https://github.com/AyouTommy/intern-cert-blockchain"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-dark-200 transition-colors flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              GitHub
            </a>
            <a
              href="mailto:ayouxiaomi@gmail.com"
              className="hover:text-dark-200 transition-colors flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              ayouxiaomi@gmail.com
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
