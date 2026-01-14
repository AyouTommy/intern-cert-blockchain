import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeftIcon, ShieldCheckIcon } from '@heroicons/react/24/outline'

export default function TermsPage() {
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
                            <ShieldCheckIcon className="w-8 h-8 text-primary-600" />
                            <h1 className="text-2xl font-display font-bold text-dark-100">服务条款</h1>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="prose prose-indigo max-w-none text-dark-200 space-y-6">
                        <p className="text-dark-300">最后更新日期：2026年1月14日</p>

                        <section>
                            <h2 className="text-xl font-semibold text-dark-100 mb-3">1. 服务说明</h2>
                            <p>
                                链证通（以下简称"本平台"）是一个基于区块链技术的高校实习证明上链系统，
                                为高校、企业和学生提供实习证明的创建、存储和验证服务。
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-dark-100 mb-3">2. 用户注册</h2>
                            <p>
                                2.1 用户在注册时应提供真实、准确、完整的个人信息。<br />
                                2.2 用户应妥善保管账号和密码，因用户原因导致的账号安全问题由用户自行承担。<br />
                                2.3 用户不得将账号转让、出借给他人使用。
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-dark-100 mb-3">3. 用户行为规范</h2>
                            <p>
                                3.1 用户承诺不会利用本平台从事任何违法违规活动。<br />
                                3.2 用户不得伪造、篡改实习证明信息。<br />
                                3.3 用户不得干扰或破坏本平台的正常运行。
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-dark-100 mb-3">4. 知识产权</h2>
                            <p>
                                本平台的所有内容，包括但不限于文字、图片、标识、界面设计等，
                                均受知识产权法律保护，未经授权不得使用。
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-dark-100 mb-3">5. 免责声明</h2>
                            <p>
                                5.1 本平台不对因不可抗力导致的服务中断承担责任。<br />
                                5.2 本平台仅提供技术平台服务，对用户上传内容的真实性不承担审核义务。<br />
                                5.3 用户因违反本条款导致的任何损失由用户自行承担。
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-dark-100 mb-3">6. 条款修改</h2>
                            <p>
                                本平台有权根据需要修改本服务条款，修改后的条款将在平台上公布。
                                用户继续使用本平台即视为接受修改后的条款。
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-semibold text-dark-100 mb-3">7. 联系方式</h2>
                            <p>
                                如有任何问题，请联系我们：<br />
                                邮箱：support@lianzhengtong.com
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
