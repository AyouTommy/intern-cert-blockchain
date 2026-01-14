import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeftIcon, LockClosedIcon } from '@heroicons/react/24/outline'

export default function PrivacyPage() {
    return (
        <div className="min-h-screen bg-dark-900">
            <div className="max-w-4xl mx-auto px-4 py-12">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-card p-8"
                >
                    {/* Header */}
                    <div className="flex items-center gap-4 mb-8">
                        <Link
                            to="/register"
                            className="p-2 rounded-lg hover:bg-dark-800 transition-colors"
                        >
                            <ArrowLeftIcon className="w-5 h-5 text-dark-300" />
                        </Link>
                        <div className="flex items-center gap-3">
                            <LockClosedIcon className="w-8 h-8 text-primary-600" />
                            <h1 className="text-2xl font-display font-bold text-dark-100">隐私政策</h1>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="prose prose-indigo max-w-none text-dark-200 space-y-6">
                        <p className="text-dark-300">最后更新日期：2026年1月14日</p>

                        <section>
                            <h2 className="text-xl font-semibold text-dark-100 mb-3">1. 信息收集</h2>
                            <p>
                                我们收集以下类型的信息：<br />
                                1.1 账户信息：姓名、邮箱、手机号码、所属机构等。<br />
                                1.2 实习信息：实习单位、岗位、时间、评价等。<br />
                                1.3 使用信息：访问时间、浏览记录、操作日志等。
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-dark-100 mb-3">2. 信息使用</h2>
                            <p>
                                我们使用收集的信息用于：<br />
                                2.1 提供、维护和改进本平台服务。<br />
                                2.2 验证用户身份和实习证明真实性。<br />
                                2.3 向用户发送服务相关通知。<br />
                                2.4 分析平台使用情况以改进用户体验。
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-dark-100 mb-3">3. 信息存储</h2>
                            <p>
                                3.1 用户账户信息存储在安全的数据库中，采用加密技术保护。<br />
                                3.2 实习证明的哈希值存储在区块链上，确保不可篡改。<br />
                                3.3 我们会定期备份数据，确保数据安全。
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-dark-100 mb-3">4. 信息共享</h2>
                            <p>
                                我们不会将用户个人信息出售给第三方。在以下情况下可能共享信息：<br />
                                4.1 获得用户明确同意。<br />
                                4.2 法律法规要求或政府部门依法要求。<br />
                                4.3 与合作高校和企业共享必要的实习证明验证信息。
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-dark-100 mb-3">5. 用户权利</h2>
                            <p>
                                用户享有以下权利：<br />
                                5.1 访问和查看个人信息。<br />
                                5.2 更正不准确的个人信息。<br />
                                5.3 删除个人账户（已上链的证明哈希无法删除）。<br />
                                5.4 导出个人数据。
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-dark-100 mb-3">6. 信息安全</h2>
                            <p>
                                我们采取多种安全措施保护用户信息：<br />
                                6.1 使用HTTPS加密传输数据。<br />
                                6.2 对敏感数据进行加密存储。<br />
                                6.3 定期进行安全审计和漏洞扫描。<br />
                                6.4 限制员工访问用户数据的权限。
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-dark-100 mb-3">7. Cookie使用</h2>
                            <p>
                                我们使用Cookie和类似技术来：<br />
                                7.1 记住用户登录状态。<br />
                                7.2 分析网站访问情况。<br />
                                7.3 提供个性化服务。<br />
                                用户可以通过浏览器设置管理Cookie。
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-dark-100 mb-3">8. 政策更新</h2>
                            <p>
                                我们可能会更新本隐私政策。重大变更将通过平台公告或邮件通知用户。
                                继续使用本平台即表示接受更新后的隐私政策。
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-dark-100 mb-3">9. 联系我们</h2>
                            <p>
                                如有隐私相关问题，请联系：<br />
                                邮箱：privacy@lianzhengtong.com
                            </p>
                        </section>
                    </div>

                    {/* Back button */}
                    <div className="mt-8 pt-6 border-t border-dark-700">
                        <Link
                            to="/register"
                            className="btn-primary inline-flex items-center gap-2"
                        >
                            <ArrowLeftIcon className="w-4 h-4" />
                            返回注册
                        </Link>
                    </div>
                </motion.div>
            </div>
        </div>
    )
}
