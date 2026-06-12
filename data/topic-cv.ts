const data: import("../types/quiz-bank").QuizBank = {
    "_config": {
        "topicNameMap": {
            "base": "基础概念",
            "image": "图像表示",
            "color": "颜色空间",
            "filter": "滤波卷积",
            "edge": "边缘与形态学",
            "feature": "特征与匹配",
            "geometry": "几何变换",
            "deep": "深度视觉",
            "eval": "评价指标",
            "combined": "综合题"
        },
        "knowledgeBase": {
            "计算机视觉": "让计算机从图像或视频中获取、理解和分析信息的技术。",
            "图像": "由像素组成的二维信号，可表示亮度、颜色和空间结构。",
            "像素": "图像的最小采样单元，保存灰度值或颜色通道值。",
            "灰度图": "每个像素通常只有一个亮度值。",
            "RGB图像": "由红、绿、蓝三个颜色通道组成。",
            "分辨率": "图像宽度和高度上的像素数量。",
            "采样": "把连续图像空间离散成像素网格。",
            "量化": "把连续亮度或颜色值映射成有限级别。",
            "直方图": "统计图像中不同灰度或颜色值出现的频数。",
            "颜色空间": "描述颜色的坐标系统，如 RGB、HSV、YCbCr。",
            "HSV": "用色调、饱和度、明度描述颜色，常用于颜色分割。",
            "卷积": "用卷积核在图像上滑动并加权求和，提取局部模式。",
            "卷积核": "用于滤波或特征提取的小矩阵。",
            "均值滤波": "用邻域平均值平滑图像，能减小噪声但会模糊边缘。",
            "高斯滤波": "按高斯权重平滑图像，常用于去噪和尺度空间。",
            "中值滤波": "取邻域中位数，适合去除椒盐噪声。",
            "边缘": "图像灰度或颜色发生明显变化的位置。",
            "Sobel算子": "基于一阶梯度检测水平和垂直边缘。",
            "Canny边缘检测": "包含高斯平滑、梯度、非极大值抑制和双阈值连接。",
            "形态学": "基于结构元素处理二值图像或灰度图像的形状操作。",
            "腐蚀": "收缩前景区域，可去除小噪声。",
            "膨胀": "扩张前景区域，可填补小空洞。",
            "开运算": "先腐蚀后膨胀，常用于去除小前景噪声。",
            "闭运算": "先膨胀后腐蚀，常用于填补小孔洞。",
            "角点": "局部两个方向变化都明显的点，适合做匹配特征。",
            "SIFT": "尺度不变特征变换，具有较强尺度和旋转鲁棒性。",
            "ORB": "快速二进制局部特征，适合实时应用。",
            "特征匹配": "根据描述子相似度寻找不同图像中的对应点。",
            "单应矩阵": "描述同一平面在两个视角图像间的投影变换。",
            "相机标定": "估计相机内参、外参和畸变参数。",
            "透视投影": "三维点投影到二维成像平面的过程，远处物体成像更小。",
            "CNN": "卷积神经网络，利用卷积层提取图像局部特征。",
            "池化": "降低特征图尺寸，增强一定平移鲁棒性。",
            "目标检测": "同时预测目标类别和位置框。",
            "图像分割": "为像素或区域分配类别标签。",
            "IoU": "交并比，衡量两个区域或边界框重叠程度。",
            "准确率": "分类正确样本占全部样本比例。",
            "召回率": "真实正样本中被正确找出的比例。",
            "mAP": "平均精度均值，目标检测常用综合指标。"
        }
    },
    "base": {
        "single": [
            {
                "question": "计算机视觉的核心目标是什么？",
                "difficulty": "易",
                "options": [
                    "让计算机理解图像和视频",
                    "只压缩文件大小",
                    "只生成随机图案",
                    "只提高网络速度"
                ],
                "answer": 0,
                "explain": "计算机视觉关注从视觉数据中获取和理解信息。"
            },
            {
                "question": "下列哪一项是计算机视觉的典型任务？",
                "difficulty": "易",
                "options": [
                    "目标检测",
                    "数据库索引",
                    "操作系统调度",
                    "编译优化"
                ],
                "answer": 0,
                "explain": "目标检测是视觉中的经典任务。"
            },
            {
                "question": "图像分类任务通常输出什么？",
                "difficulty": "易",
                "options": [
                    "整张图像的类别",
                    "每个像素的坐标",
                    "相机焦距",
                    "网络带宽"
                ],
                "answer": 0,
                "explain": "分类判断整张图像属于哪一类。"
            },
            {
                "question": "目标检测相比图像分类多了哪类输出？",
                "difficulty": "易",
                "options": [
                    "目标位置",
                    "文件路径",
                    "音频波形",
                    "程序变量名"
                ],
                "answer": 0,
                "explain": "检测需要输出类别和位置框。"
            },
            {
                "question": "图像分割任务更关注什么？",
                "difficulty": "易",
                "options": [
                    "像素级或区域级类别",
                    "CPU 主频",
                    "键盘输入速度",
                    "文件扩展名"
                ],
                "answer": 0,
                "explain": "分割通常给像素或区域分配标签。"
            },
            {
                "question": "传统计算机视觉方法通常更依赖什么？",
                "difficulty": "中",
                "options": [
                    "人工设计特征",
                    "随机删除图像",
                    "只用文本规则",
                    "不需要任何数据"
                ],
                "answer": 0,
                "explain": "传统方法常依赖边缘、角点、纹理等手工特征。"
            },
            {
                "question": "深度学习视觉方法相比传统方法的主要优势之一是？",
                "difficulty": "中",
                "options": [
                    "能自动学习多层特征",
                    "完全不需要训练数据",
                    "只能处理黑白图",
                    "不需要计算资源"
                ],
                "answer": 0,
                "explain": "CNN 等模型可从数据中学习层级特征。"
            },
            {
                "question": "下列哪项不是常见视觉数据？",
                "difficulty": "易",
                "options": [
                    "图像",
                    "视频",
                    "深度图",
                    "源代码语法树"
                ],
                "answer": 3,
                "explain": "源代码语法树不是典型视觉数据。"
            }
        ],
        "judge": [
            {
                "question": "计算机视觉只研究灰度图，不研究彩色图。",
                "difficulty": "易",
                "answer": false,
                "explain": "视觉研究灰度图、彩色图、视频、深度图等多种数据。"
            },
            {
                "question": "目标检测需要判断图像中目标的位置。",
                "difficulty": "易",
                "answer": true,
                "explain": "检测输出类别和边界框。"
            },
            {
                "question": "图像分类通常不需要输出目标框。",
                "difficulty": "易",
                "answer": true,
                "explain": "分类只输出整体类别。"
            },
            {
                "question": "图像分割可以得到更细粒度的空间结果。",
                "difficulty": "中",
                "answer": true,
                "explain": "分割通常达到像素级或区域级。"
            },
            {
                "question": "计算机视觉应用包括人脸识别、自动驾驶感知和医学影像分析。",
                "difficulty": "易",
                "answer": true,
                "explain": "这些都是典型视觉应用。"
            },
            {
                "question": "深度学习出现后，所有传统视觉方法都完全没有价值。",
                "difficulty": "中",
                "answer": false,
                "explain": "传统方法仍常用于预处理、几何估计和可解释场景。"
            }
        ],
        "fill": [
            {
                "question": "计算机视觉的输入通常是图像或______。",
                "difficulty": "易",
                "answer": "视频",
                "explain": "视频是连续图像序列。"
            },
            {
                "question": "目标检测通常输出目标类别和______。",
                "difficulty": "易",
                "answer": "位置",
                "explain": "位置常用边界框表示。"
            },
            {
                "question": "图像分割常把类别标签分配到像素或______。",
                "difficulty": "中",
                "answer": "区域",
                "explain": "语义分割和实例分割都关注空间区域。"
            }
        ]
    },
    "image": {
        "single": [
            {
                "question": "数字图像最基本的组成单元是什么？",
                "difficulty": "易",
                "options": [
                    "像素",
                    "句子",
                    "函数",
                    "数据库表"
                ],
                "answer": 0,
                "explain": "像素是数字图像的最小采样单元。"
            },
            {
                "question": "一幅 640×480 图像共有多少个像素？",
                "difficulty": "易",
                "options": [
                    "307200",
                    "1120",
                    "160000",
                    "480"
                ],
                "answer": 0,
                "explain": "像素数为 640×480=307200。"
            },
            {
                "question": "8 位灰度图中单个像素通常有多少种取值？",
                "difficulty": "易",
                "options": [
                    "2",
                    "16",
                    "256",
                    "1024"
                ],
                "answer": 2,
                "explain": "8 位可表示 2^8=256 个灰度级。"
            },
            {
                "question": "图像直方图主要描述什么？",
                "difficulty": "易",
                "options": [
                    "灰度或颜色值分布",
                    "相机品牌",
                    "文件创建时间",
                    "网络延迟"
                ],
                "answer": 0,
                "explain": "直方图统计像素值出现频数。"
            },
            {
                "question": "采样过程主要对应图像的哪种离散化？",
                "difficulty": "中",
                "options": [
                    "空间坐标离散化",
                    "类别标签随机化",
                    "程序语句压缩",
                    "模型参数冻结"
                ],
                "answer": 0,
                "explain": "采样把连续空间变成像素网格。"
            },
            {
                "question": "量化过程主要对应图像的哪种离散化？",
                "difficulty": "中",
                "options": [
                    "亮度或颜色值离散化",
                    "相机位置离散化",
                    "文件名排序",
                    "样本数量扩充"
                ],
                "answer": 0,
                "explain": "量化把连续强度映射到有限级。"
            },
            {
                "question": "图像坐标系中常见的原点位置是？",
                "difficulty": "中",
                "options": [
                    "左上角",
                    "左下角",
                    "图像中心",
                    "随机位置"
                ],
                "answer": 0,
                "explain": "多数图像库使用左上角作为原点。"
            },
            {
                "question": "图像归一化常见目的是什么？",
                "difficulty": "中",
                "options": [
                    "让数值范围更适合模型处理",
                    "删除所有颜色",
                    "改变图像语义类别",
                    "保证图像不含噪声"
                ],
                "answer": 0,
                "explain": "归一化可改善数值尺度和训练稳定性。"
            }
        ],
        "judge": [
            {
                "question": "分辨率越高，图像一定包含越多语义信息。",
                "difficulty": "中",
                "answer": false,
                "explain": "高分辨率像素更多，但语义信息还受内容、噪声和成像质量影响。"
            },
            {
                "question": "8 位灰度图的像素值通常在 0 到 255 之间。",
                "difficulty": "易",
                "answer": true,
                "explain": "8 位灰度有 256 个等级。"
            },
            {
                "question": "直方图能直接表示像素的空间位置关系。",
                "difficulty": "中",
                "answer": false,
                "explain": "普通直方图统计频数，丢失空间布局。"
            },
            {
                "question": "图像噪声可能影响边缘检测和识别效果。",
                "difficulty": "易",
                "answer": true,
                "explain": "噪声会干扰局部灰度变化和特征提取。"
            },
            {
                "question": "灰度图每个像素通常只保存一个亮度值。",
                "difficulty": "易",
                "answer": true,
                "explain": "灰度图没有独立的 RGB 三通道。"
            },
            {
                "question": "量化位数越低，越容易出现灰度层次损失。",
                "difficulty": "中",
                "answer": true,
                "explain": "量化级数少会造成细节损失。"
            }
        ],
        "fill": [
            {
                "question": "8 位灰度图通常有______个灰度级。",
                "difficulty": "易",
                "answer": "256",
                "explain": "2 的 8 次方等于 256。"
            },
            {
                "question": "图像宽为 100、高为 50，则总像素数为______。",
                "difficulty": "易",
                "answer": "5000",
                "explain": "总像素数为宽乘高。"
            },
            {
                "question": "普通图像直方图统计的是像素值出现的______。",
                "difficulty": "易",
                "answer": "频数",
                "explain": "也可归一化为概率分布。"
            }
        ]
    },
    "color": {
        "single": [
            {
                "question": "RGB 图像通常包含哪三个通道？",
                "difficulty": "易",
                "options": [
                    "红绿蓝",
                    "黑白灰",
                    "高宽深",
                    "明暗边"
                ],
                "answer": 0,
                "explain": "RGB 分别表示 Red、Green、Blue。"
            },
            {
                "question": "HSV 中 H 表示什么？",
                "difficulty": "易",
                "options": [
                    "色调",
                    "高度",
                    "热度",
                    "直方图"
                ],
                "answer": 0,
                "explain": "H 是 Hue，表示色调。"
            },
            {
                "question": "HSV 中 S 表示什么？",
                "difficulty": "易",
                "options": [
                    "饱和度",
                    "尺度",
                    "速度",
                    "采样率"
                ],
                "answer": 0,
                "explain": "S 是 Saturation，表示饱和度。"
            },
            {
                "question": "HSV 中 V 表示什么？",
                "difficulty": "易",
                "options": [
                    "明度",
                    "体积",
                    "向量",
                    "方差"
                ],
                "answer": 0,
                "explain": "V 是 Value，表示明度。"
            },
            {
                "question": "在颜色分割中，HSV 相比 RGB 的常见优势是？",
                "difficulty": "中",
                "options": [
                    "颜色属性更接近人类直观感受",
                    "完全不受光照影响",
                    "只能表示灰度",
                    "不需要阈值"
                ],
                "answer": 0,
                "explain": "HSV 把色调、饱和度和明度分开，便于按颜色阈值处理。"
            },
            {
                "question": "把彩色图转换成灰度图通常会损失什么信息？",
                "difficulty": "易",
                "options": [
                    "颜色信息",
                    "图像宽度",
                    "像素数量",
                    "文件路径"
                ],
                "answer": 0,
                "explain": "灰度图保留亮度，丢失独立颜色通道。"
            },
            {
                "question": "YCbCr 中 Y 通道通常表示什么？",
                "difficulty": "中",
                "options": [
                    "亮度",
                    "蓝色坐标",
                    "红色坐标",
                    "边缘强度"
                ],
                "answer": 0,
                "explain": "Y 通道表示亮度，Cb/Cr 表示色度。"
            },
            {
                "question": "白平衡主要用于校正什么问题？",
                "difficulty": "中",
                "options": [
                    "不同光源导致的颜色偏差",
                    "图像尺寸过大",
                    "目标框过小",
                    "网络训练轮数不足"
                ],
                "answer": 0,
                "explain": "白平衡让白色物体在不同光照下尽量保持白色。"
            }
        ],
        "judge": [
            {
                "question": "RGB 的三个通道分别是红、绿、蓝。",
                "difficulty": "易",
                "answer": true,
                "explain": "RGB 是最常见颜色空间之一。"
            },
            {
                "question": "HSV 的 H 通道表示图像高度。",
                "difficulty": "易",
                "answer": false,
                "explain": "H 表示 Hue，即色调。"
            },
            {
                "question": "灰度图不能保留完整颜色信息。",
                "difficulty": "易",
                "answer": true,
                "explain": "灰度图通常只保留亮度。"
            },
            {
                "question": "不同颜色空间适合不同视觉任务。",
                "difficulty": "中",
                "answer": true,
                "explain": "例如 HSV 适合颜色阈值分割，YCbCr 常用于视频编码。"
            },
            {
                "question": "颜色直方图完全不受光照变化影响。",
                "difficulty": "中",
                "answer": false,
                "explain": "光照变化会影响颜色分布。"
            },
            {
                "question": "白平衡可以缓解图像整体偏色。",
                "difficulty": "易",
                "answer": true,
                "explain": "白平衡常用于颜色校正。"
            }
        ],
        "fill": [
            {
                "question": "RGB 中 B 表示______。",
                "difficulty": "易",
                "answer": "蓝色",
                "explain": "B 是 Blue。"
            },
            {
                "question": "HSV 中用于表示色调的是______通道。",
                "difficulty": "易",
                "answer": "H",
                "explain": "H 是 Hue。"
            },
            {
                "question": "把 RGB 转成灰度通常会丢失______信息。",
                "difficulty": "易",
                "answer": "颜色",
                "explain": "灰度图只保留亮度或强度。"
            }
        ]
    },
    "filter": {
        "single": [
            {
                "question": "图像卷积操作的核心是什么？",
                "difficulty": "易",
                "options": [
                    "卷积核滑动加权求和",
                    "随机改变文件名",
                    "删除所有像素",
                    "只统计图像大小"
                ],
                "answer": 0,
                "explain": "卷积用局部窗口和卷积核计算新像素值。"
            },
            {
                "question": "均值滤波的主要作用是什么？",
                "difficulty": "易",
                "options": [
                    "平滑图像",
                    "增强所有边缘",
                    "估计相机位姿",
                    "输出目标类别"
                ],
                "answer": 0,
                "explain": "均值滤波用邻域平均降低噪声。"
            },
            {
                "question": "中值滤波特别适合处理哪类噪声？",
                "difficulty": "中",
                "options": [
                    "椒盐噪声",
                    "语义噪声",
                    "类别不平衡",
                    "网络丢包"
                ],
                "answer": 0,
                "explain": "中值滤波能有效抑制孤立亮暗点。"
            },
            {
                "question": "高斯滤波中的权重分布通常由什么决定？",
                "difficulty": "中",
                "options": [
                    "高斯函数",
                    "随机函数",
                    "字符串长度",
                    "文件格式"
                ],
                "answer": 0,
                "explain": "离中心越近权重通常越大。"
            },
            {
                "question": "卷积核尺寸变大通常会带来什么影响？",
                "difficulty": "中",
                "options": [
                    "感受野增大，计算量增加",
                    "像素数量必定减少为 0",
                    "颜色通道自动消失",
                    "模型不再需要训练"
                ],
                "answer": 0,
                "explain": "大核覆盖更大邻域，也需要更多计算。"
            },
            {
                "question": "图像锐化滤波通常强调什么？",
                "difficulty": "中",
                "options": [
                    "局部灰度变化",
                    "文件压缩率",
                    "相机品牌",
                    "键盘输入"
                ],
                "answer": 0,
                "explain": "锐化增强边缘和细节。"
            },
            {
                "question": "卷积中的 padding 主要影响什么？",
                "difficulty": "中",
                "options": [
                    "输出特征图尺寸",
                    "样本标签名称",
                    "显示器亮度",
                    "训练集类别数"
                ],
                "answer": 0,
                "explain": "填充会影响边界处计算和输出大小。"
            },
            {
                "question": "低通滤波通常保留图像中的什么成分？",
                "difficulty": "中",
                "options": [
                    "低频平滑成分",
                    "全部高频噪声",
                    "目标类别编号",
                    "图像文件名"
                ],
                "answer": 0,
                "explain": "低通滤波抑制高频，保留平滑变化。"
            }
        ],
        "judge": [
            {
                "question": "均值滤波可能导致图像边缘变模糊。",
                "difficulty": "易",
                "answer": true,
                "explain": "平滑会削弱边缘细节。"
            },
            {
                "question": "中值滤波对椒盐噪声通常比较有效。",
                "difficulty": "易",
                "answer": true,
                "explain": "中位数能去除孤立极端值。"
            },
            {
                "question": "卷积核只能是 1×1 大小。",
                "difficulty": "易",
                "answer": false,
                "explain": "常见卷积核包括 3×3、5×5 等。"
            },
            {
                "question": "高斯滤波是一种常见平滑滤波。",
                "difficulty": "易",
                "answer": true,
                "explain": "常用于去噪和预处理。"
            },
            {
                "question": "卷积操作完全不使用邻域信息。",
                "difficulty": "易",
                "answer": false,
                "explain": "卷积正是利用局部邻域。"
            },
            {
                "question": "锐化会增强图像局部变化，但也可能放大噪声。",
                "difficulty": "中",
                "answer": true,
                "explain": "噪声也属于高频变化，可能被增强。"
            }
        ],
        "fill": [
            {
                "question": "卷积操作用小矩阵在图像上滑动，这个小矩阵称为______。",
                "difficulty": "易",
                "answer": "卷积核",
                "explain": "也可称滤波器或 kernel。"
            },
            {
                "question": "中值滤波常用于去除______噪声。",
                "difficulty": "易",
                "answer": "椒盐",
                "explain": "椒盐噪声表现为孤立黑白点。"
            },
            {
                "question": "低通滤波通常会使图像更______。",
                "difficulty": "易",
                "answer": "平滑",
                "explain": "低通抑制高频细节和噪声。"
            }
        ]
    },
    "edge": {
        "single": [
            {
                "question": "边缘通常对应图像中什么发生明显变化的位置？",
                "difficulty": "易",
                "options": [
                    "灰度或颜色",
                    "文件名称",
                    "存储路径",
                    "相机序列号"
                ],
                "answer": 0,
                "explain": "边缘是局部强度突变区域。"
            },
            {
                "question": "Sobel 算子主要用于估计什么？",
                "difficulty": "易",
                "options": [
                    "图像梯度",
                    "相机内参",
                    "网络协议",
                    "文件权限"
                ],
                "answer": 0,
                "explain": "Sobel 用差分近似梯度。"
            },
            {
                "question": "Canny 边缘检测第一步通常是什么？",
                "difficulty": "中",
                "options": [
                    "高斯平滑去噪",
                    "随机打乱像素",
                    "直接输出类别",
                    "删除图像边界"
                ],
                "answer": 0,
                "explain": "Canny 先平滑，降低噪声干扰。"
            },
            {
                "question": "非极大值抑制在 Canny 中的作用是？",
                "difficulty": "中",
                "options": [
                    "细化边缘",
                    "增加图像亮度",
                    "生成颜色直方图",
                    "计算训练损失"
                ],
                "answer": 0,
                "explain": "它保留梯度方向上的局部极大响应。"
            },
            {
                "question": "二值形态学中的腐蚀操作通常会使前景区域怎样变化？",
                "difficulty": "易",
                "options": [
                    "收缩",
                    "扩张",
                    "旋转",
                    "变成彩色"
                ],
                "answer": 0,
                "explain": "腐蚀会缩小前景。"
            },
            {
                "question": "二值形态学中的膨胀操作通常会使前景区域怎样变化？",
                "difficulty": "易",
                "options": [
                    "扩张",
                    "收缩",
                    "随机消失",
                    "变为灰度"
                ],
                "answer": 0,
                "explain": "膨胀会扩大前景。"
            },
            {
                "question": "开运算的操作顺序是什么？",
                "difficulty": "中",
                "options": [
                    "先腐蚀后膨胀",
                    "先膨胀后腐蚀",
                    "先旋转后缩放",
                    "先分类后检测"
                ],
                "answer": 0,
                "explain": "开运算常用于去除小前景噪声。"
            },
            {
                "question": "闭运算的操作顺序是什么？",
                "difficulty": "中",
                "options": [
                    "先膨胀后腐蚀",
                    "先腐蚀后膨胀",
                    "先二值化后彩色化",
                    "先检测后训练"
                ],
                "answer": 0,
                "explain": "闭运算常用于填补小空洞。"
            }
        ],
        "judge": [
            {
                "question": "边缘检测对噪声完全不敏感。",
                "difficulty": "中",
                "answer": false,
                "explain": "噪声也会造成局部突变，干扰边缘。"
            },
            {
                "question": "Sobel 算子可以用于计算图像梯度近似。",
                "difficulty": "易",
                "answer": true,
                "explain": "Sobel 是常见一阶梯度算子。"
            },
            {
                "question": "Canny 边缘检测通常包含双阈值连接。",
                "difficulty": "中",
                "answer": true,
                "explain": "双阈值用于连接强弱边缘。"
            },
            {
                "question": "腐蚀操作会扩张二值图像前景。",
                "difficulty": "易",
                "answer": false,
                "explain": "腐蚀会收缩前景。"
            },
            {
                "question": "膨胀操作可以填补一些小空洞或连接断裂区域。",
                "difficulty": "中",
                "answer": true,
                "explain": "膨胀会扩大前景区域。"
            },
            {
                "question": "开运算等于先膨胀后腐蚀。",
                "difficulty": "中",
                "answer": false,
                "explain": "开运算是先腐蚀后膨胀。"
            }
        ],
        "fill": [
            {
                "question": "Sobel 算子常用于估计图像______。",
                "difficulty": "易",
                "answer": "梯度",
                "explain": "梯度反映局部变化方向和强度。"
            },
            {
                "question": "形态学开运算是先腐蚀后______。",
                "difficulty": "易",
                "answer": "膨胀",
                "explain": "开运算常去除小前景噪声。"
            },
            {
                "question": "形态学闭运算是先膨胀后______。",
                "difficulty": "易",
                "answer": "腐蚀",
                "explain": "闭运算常填补小孔洞。"
            }
        ]
    },
    "feature": {
        "single": [
            {
                "question": "角点的典型特点是什么？",
                "difficulty": "中",
                "options": [
                    "局部两个方向灰度变化都明显",
                    "整幅图完全均匀",
                    "只存在单一颜色",
                    "没有任何纹理"
                ],
                "answer": 0,
                "explain": "角点在多个方向上都有明显变化，便于定位。"
            },
            {
                "question": "局部特征描述子的主要作用是什么？",
                "difficulty": "中",
                "options": [
                    "描述关键点附近的局部模式",
                    "改变图像文件扩展名",
                    "生成随机标签",
                    "删除所有背景"
                ],
                "answer": 0,
                "explain": "描述子用于比较和匹配局部区域。"
            },
            {
                "question": "SIFT 特征的优势通常包括什么？",
                "difficulty": "中",
                "options": [
                    "尺度和旋转鲁棒性较强",
                    "只能处理纯黑图",
                    "不需要提取关键点",
                    "完全不受遮挡影响"
                ],
                "answer": 0,
                "explain": "SIFT 设计上考虑尺度和方向。"
            },
            {
                "question": "ORB 特征常见优势是什么？",
                "difficulty": "中",
                "options": [
                    "速度快，适合实时应用",
                    "只能用于医学图像",
                    "必须使用 GPU",
                    "不能做匹配"
                ],
                "answer": 0,
                "explain": "ORB 是快速二进制特征。"
            },
            {
                "question": "特征匹配中常用描述子之间的什么来判断相似？",
                "difficulty": "易",
                "options": [
                    "距离",
                    "文件大小",
                    "创建时间",
                    "图像标题"
                ],
                "answer": 0,
                "explain": "常用欧氏距离或汉明距离。"
            },
            {
                "question": "RANSAC 在特征匹配后常用于什么？",
                "difficulty": "难",
                "options": [
                    "剔除外点并估计模型",
                    "提高显示器亮度",
                    "生成更多颜色通道",
                    "压缩源代码"
                ],
                "answer": 0,
                "explain": "RANSAC 可在含错误匹配时鲁棒估计几何模型。"
            },
            {
                "question": "二进制描述子常用哪种距离进行匹配？",
                "difficulty": "中",
                "options": [
                    "汉明距离",
                    "曼哈顿城区面积",
                    "文件路径距离",
                    "训练轮数差"
                ],
                "answer": 0,
                "explain": "ORB 等二进制描述子常用汉明距离。"
            },
            {
                "question": "纹理特征主要描述图像中的什么？",
                "difficulty": "中",
                "options": [
                    "局部重复模式和粗细变化",
                    "相机电池容量",
                    "网页结构",
                    "数据库主键"
                ],
                "answer": 0,
                "explain": "纹理反映局部灰度或颜色排列规律。"
            }
        ],
        "judge": [
            {
                "question": "角点通常比大面积平坦区域更适合做特征匹配。",
                "difficulty": "中",
                "answer": true,
                "explain": "角点更容易被稳定定位和区分。"
            },
            {
                "question": "描述子越相似，两个关键点越可能对应同一物理点。",
                "difficulty": "中",
                "answer": true,
                "explain": "匹配通常基于描述子相似度。"
            },
            {
                "question": "SIFT 完全不受尺度变化影响。",
                "difficulty": "中",
                "answer": false,
                "explain": "SIFT 较鲁棒，但不是绝对不受影响。"
            },
            {
                "question": "ORB 是一种常见快速局部特征。",
                "difficulty": "易",
                "answer": true,
                "explain": "ORB 适合实时或资源受限场景。"
            },
            {
                "question": "RANSAC 可以帮助减少错误匹配对几何估计的影响。",
                "difficulty": "难",
                "answer": true,
                "explain": "RANSAC 通过随机采样寻找内点一致模型。"
            },
            {
                "question": "所有局部特征都只能用于分类，不能用于拼接。",
                "difficulty": "中",
                "answer": false,
                "explain": "局部特征常用于图像拼接、定位和三维重建。"
            }
        ],
        "fill": [
            {
                "question": "ORB 等二进制描述子常用______距离进行匹配。",
                "difficulty": "中",
                "answer": "汉明",
                "explain": "汉明距离统计二进制位不同的数量。"
            },
            {
                "question": "RANSAC 常用于剔除错误匹配中的______。",
                "difficulty": "难",
                "answer": "外点",
                "explain": "外点不符合主要几何模型。"
            },
            {
                "question": "SIFT 的中文常译为尺度不变______变换。",
                "difficulty": "中",
                "answer": "特征",
                "explain": "SIFT 是 Scale-Invariant Feature Transform。"
            }
        ]
    },
    "geometry": {
        "single": [
            {
                "question": "平移变换主要改变图像中物体的什么？",
                "difficulty": "易",
                "options": [
                    "位置",
                    "类别",
                    "颜色空间定义",
                    "文件权限"
                ],
                "answer": 0,
                "explain": "平移会改变坐标位置。"
            },
            {
                "question": "仿射变换可以保持什么性质？",
                "difficulty": "中",
                "options": [
                    "平行线仍平行",
                    "所有角度完全不变",
                    "所有长度完全不变",
                    "像素值不可能变化"
                ],
                "answer": 0,
                "explain": "仿射变换保持直线和平行性。"
            },
            {
                "question": "透视变换相比仿射变换更能描述什么现象？",
                "difficulty": "中",
                "options": [
                    "近大远小",
                    "文件重命名",
                    "亮度归一化",
                    "通道交换"
                ],
                "answer": 0,
                "explain": "透视投影会产生近大远小。"
            },
            {
                "question": "单应矩阵常用于描述什么关系？",
                "difficulty": "难",
                "options": [
                    "同一平面在两幅图像之间的投影关系",
                    "音频和文本之间的关系",
                    "数据库表之间的关系",
                    "CPU 和内存之间的关系"
                ],
                "answer": 0,
                "explain": "平面场景或纯旋转相机常可用单应矩阵。"
            },
            {
                "question": "相机内参通常不包括哪一项？",
                "difficulty": "中",
                "options": [
                    "物体真实类别",
                    "焦距",
                    "主点",
                    "像素尺度"
                ],
                "answer": 0,
                "explain": "类别属于语义标签，不是相机内参。"
            },
            {
                "question": "相机外参主要描述什么？",
                "difficulty": "中",
                "options": [
                    "相机相对世界坐标的位姿",
                    "图像压缩格式",
                    "网络训练损失",
                    "像素量化位数"
                ],
                "answer": 0,
                "explain": "外参通常包括旋转和平移。"
            },
            {
                "question": "径向畸变常见表现是什么？",
                "difficulty": "中",
                "options": [
                    "直线在图像边缘弯曲",
                    "图像自动分类",
                    "像素值全为 0",
                    "视频帧率变高"
                ],
                "answer": 0,
                "explain": "镜头畸变会使直线看起来弯曲。"
            },
            {
                "question": "双目视觉估计深度常依赖什么？",
                "difficulty": "难",
                "options": [
                    "左右图像视差",
                    "文件名长度",
                    "颜色通道数量",
                    "训练批大小"
                ],
                "answer": 0,
                "explain": "视差越大通常表示物体越近。"
            }
        ],
        "judge": [
            {
                "question": "仿射变换可以保持直线仍为直线。",
                "difficulty": "中",
                "answer": true,
                "explain": "仿射变换保持共线性。"
            },
            {
                "question": "透视投影中远处物体通常成像更小。",
                "difficulty": "易",
                "answer": true,
                "explain": "这就是近大远小。"
            },
            {
                "question": "相机标定可以估计相机内参和畸变参数。",
                "difficulty": "中",
                "answer": true,
                "explain": "标定常估计内参、外参和畸变。"
            },
            {
                "question": "单应矩阵适用于任意非刚体三维变形场景。",
                "difficulty": "难",
                "answer": false,
                "explain": "单应矩阵主要适合平面或特定相机运动条件。"
            },
            {
                "question": "双目视觉中的视差与深度估计有关。",
                "difficulty": "中",
                "answer": true,
                "explain": "深度可由基线、焦距和视差计算。"
            },
            {
                "question": "相机外参通常描述焦距和主点。",
                "difficulty": "中",
                "answer": false,
                "explain": "焦距和主点属于内参，外参描述位姿。"
            }
        ],
        "fill": [
            {
                "question": "相机外参通常包括旋转和______。",
                "difficulty": "中",
                "answer": "平移",
                "explain": "外参描述相机坐标与世界坐标的关系。"
            },
            {
                "question": "双目视觉常通过左右图像的______估计深度。",
                "difficulty": "难",
                "answer": "视差",
                "explain": "视差与深度成反比关系。"
            },
            {
                "question": "描述同一平面两视图投影关系的 3×3 矩阵称为______矩阵。",
                "difficulty": "难",
                "answer": "单应",
                "explain": "单应矩阵也称 Homography。"
            }
        ]
    },
    "deep": {
        "single": [
            {
                "question": "CNN 中卷积层的主要作用是什么？",
                "difficulty": "易",
                "options": [
                    "提取局部特征",
                    "管理文件系统",
                    "编译源代码",
                    "发送网络请求"
                ],
                "answer": 0,
                "explain": "卷积层通过局部连接和权重共享提取特征。"
            },
            {
                "question": "池化层的常见作用是什么？",
                "difficulty": "易",
                "options": [
                    "降低特征图尺寸",
                    "增加图像原始分辨率",
                    "改变标签语义",
                    "删除训练集"
                ],
                "answer": 0,
                "explain": "池化可减少空间尺寸和计算量。"
            },
            {
                "question": "卷积神经网络中的权重共享带来什么好处？",
                "difficulty": "中",
                "options": [
                    "减少参数量",
                    "增加文件大小",
                    "必须手写所有特征",
                    "让图像无法训练"
                ],
                "answer": 0,
                "explain": "同一卷积核在不同位置复用参数。"
            },
            {
                "question": "ReLU 激活函数的常见形式是？",
                "difficulty": "中",
                "options": [
                    "max(0, x)",
                    "x^3+1",
                    "只输出 -1",
                    "随机输出字符串"
                ],
                "answer": 0,
                "explain": "ReLU 保留正值，把负值置 0。"
            },
            {
                "question": "数据增强在视觉训练中的作用是？",
                "difficulty": "中",
                "options": [
                    "增加样本多样性，提高泛化",
                    "删除测试集",
                    "固定所有参数",
                    "让标签随机错误"
                ],
                "answer": 0,
                "explain": "翻转、裁剪、颜色扰动等可提升泛化。"
            },
            {
                "question": "目标检测模型通常需要预测什么？",
                "difficulty": "易",
                "options": [
                    "类别和边界框",
                    "只预测文件名",
                    "只预测图像宽度",
                    "只预测训练时间"
                ],
                "answer": 0,
                "explain": "检测同时解决分类和定位。"
            },
            {
                "question": "语义分割的输出通常是什么？",
                "difficulty": "中",
                "options": [
                    "每个像素的类别",
                    "整张图一个类别",
                    "文件压缩率",
                    "相机快门声"
                ],
                "answer": 0,
                "explain": "语义分割是像素级分类。"
            },
            {
                "question": "迁移学习在视觉任务中常怎么使用？",
                "difficulty": "中",
                "options": [
                    "用预训练模型初始化再微调",
                    "完全不使用任何数据",
                    "只改变图片文件名",
                    "关闭损失函数"
                ],
                "answer": 0,
                "explain": "ImageNet 预训练模型常用于下游任务。"
            }
        ],
        "judge": [
            {
                "question": "CNN 的卷积层可以自动学习图像特征。",
                "difficulty": "易",
                "answer": true,
                "explain": "卷积核参数通过训练学习。"
            },
            {
                "question": "池化层通常会增大特征图空间尺寸。",
                "difficulty": "易",
                "answer": false,
                "explain": "池化一般降低尺寸。"
            },
            {
                "question": "数据增强可以在一定程度上缓解过拟合。",
                "difficulty": "中",
                "answer": true,
                "explain": "增强能增加训练样本变化。"
            },
            {
                "question": "目标检测只需要输出类别，不需要位置。",
                "difficulty": "易",
                "answer": false,
                "explain": "检测必须定位目标。"
            },
            {
                "question": "语义分割会区分同一类别中的不同实例。",
                "difficulty": "中",
                "answer": false,
                "explain": "语义分割不区分实例，实例分割才区分。"
            },
            {
                "question": "迁移学习常用于训练数据较少的视觉任务。",
                "difficulty": "中",
                "answer": true,
                "explain": "预训练特征可降低从零训练需求。"
            }
        ],
        "fill": [
            {
                "question": "CNN 的中文常称为______神经网络。",
                "difficulty": "易",
                "answer": "卷积",
                "explain": "CNN 是 Convolutional Neural Network。"
            },
            {
                "question": "目标检测通常输出类别和______框。",
                "difficulty": "易",
                "answer": "边界",
                "explain": "边界框用于描述目标位置。"
            },
            {
                "question": "用预训练模型初始化并在新任务上训练，常称为______学习。",
                "difficulty": "中",
                "answer": "迁移",
                "explain": "迁移学习把已有知识迁移到新任务。"
            }
        ]
    },
    "eval": {
        "single": [
            {
                "question": "分类准确率的含义是什么？",
                "difficulty": "易",
                "options": [
                    "正确分类样本占全部样本比例",
                    "错误样本占正样本比例",
                    "目标框面积之和",
                    "图像像素平均值"
                ],
                "answer": 0,
                "explain": "准确率=正确数/总数。"
            },
            {
                "question": "精确率 Precision 关注什么？",
                "difficulty": "中",
                "options": [
                    "预测为正的样本中有多少是真的正",
                    "所有真实正样本有多少被找出",
                    "图像有多少像素",
                    "边界框有多大"
                ],
                "answer": 0,
                "explain": "Precision=TP/(TP+FP)。"
            },
            {
                "question": "召回率 Recall 关注什么？",
                "difficulty": "中",
                "options": [
                    "真实正样本中有多少被找出",
                    "预测为正的样本中有多少是真的正",
                    "图像亮度是否变大",
                    "模型参数是否最多"
                ],
                "answer": 0,
                "explain": "Recall=TP/(TP+FN)。"
            },
            {
                "question": "IoU 用于衡量什么？",
                "difficulty": "易",
                "options": [
                    "两个区域的重叠程度",
                    "训练速度",
                    "图像通道数",
                    "颜色饱和度"
                ],
                "answer": 0,
                "explain": "IoU=交集面积/并集面积。"
            },
            {
                "question": "目标检测中 mAP 是什么类型的指标？",
                "difficulty": "中",
                "options": [
                    "综合检测精度指标",
                    "图像压缩指标",
                    "相机焦距指标",
                    "像素亮度指标"
                ],
                "answer": 0,
                "explain": "mAP 是 mean Average Precision。"
            },
            {
                "question": "混淆矩阵常用于分析什么任务？",
                "difficulty": "易",
                "options": [
                    "分类结果",
                    "图像旋转角",
                    "相机畸变",
                    "文件读写速度"
                ],
                "answer": 0,
                "explain": "混淆矩阵展示各类别预测与真实的对应关系。"
            },
            {
                "question": "若两个边界框完全重合，则 IoU 等于多少？",
                "difficulty": "易",
                "options": [
                    "1",
                    "0",
                    "0.5",
                    "2"
                ],
                "answer": 0,
                "explain": "完全重合时交集等于并集，IoU=1。"
            },
            {
                "question": "若两个边界框没有任何重叠，则 IoU 等于多少？",
                "difficulty": "易",
                "options": [
                    "0",
                    "1",
                    "0.5",
                    "-1"
                ],
                "answer": 0,
                "explain": "无重叠时交集面积为 0。"
            }
        ],
        "judge": [
            {
                "question": "准确率在类别极不平衡时可能具有误导性。",
                "difficulty": "中",
                "answer": true,
                "explain": "多数类占比很高时，模型即使忽略少数类也可能准确率很高。"
            },
            {
                "question": "IoU 越大，两个区域重叠程度通常越高。",
                "difficulty": "易",
                "answer": true,
                "explain": "IoU 最大为 1。"
            },
            {
                "question": "召回率越高表示漏检通常越少。",
                "difficulty": "中",
                "answer": true,
                "explain": "召回率高说明更多真实正样本被找出。"
            },
            {
                "question": "Precision 和 Recall 永远完全相同。",
                "difficulty": "易",
                "answer": false,
                "explain": "二者关注点不同，数值不一定相同。"
            },
            {
                "question": "mAP 常用于目标检测模型评估。",
                "difficulty": "易",
                "answer": true,
                "explain": "mAP 是检测任务常用指标。"
            },
            {
                "question": "混淆矩阵无法显示类别之间的误分类情况。",
                "difficulty": "易",
                "answer": false,
                "explain": "混淆矩阵正是用来显示误分类分布。"
            }
        ],
        "fill": [
            {
                "question": "IoU 的中文常称为______比。",
                "difficulty": "易",
                "answer": "交并",
                "explain": "IoU=Intersection over Union。"
            },
            {
                "question": "准确率等于正确预测数量除以______数量。",
                "difficulty": "易",
                "answer": "总样本",
                "explain": "Accuracy=正确数/总数。"
            },
            {
                "question": "mAP 的英文全称中 m 表示______。",
                "difficulty": "中",
                "answer": "mean",
                "explain": "mAP 是 mean Average Precision。"
            }
        ]
    },
    "calcQuestions": [
        {
            "question": "一幅灰度图像大小为 640×480，每个像素用 8 bit 表示。试计算该图像共有多少个像素，以及未压缩存储时约占多少字节。",
            "difficulty": "中",
            "answer": "像素总数为 $640×480=307200$。\n每个像素 8 bit，即 1 byte。\n因此未压缩存储大小为 $307200×1=307200$ 字节，约为 300 KB。",
            "prompt": "图像像素数与存储量计算"
        },
        {
            "question": "给定两个目标检测框的交集面积为 40，预测框面积为 100，真实框面积为 80。试计算它们的 IoU。",
            "difficulty": "中",
            "answer": "并集面积为 $100+80-40=140$。\nIoU 为交集面积除以并集面积：$\\mathrm{IoU}=\\frac{40}{140}=\\frac{2}{7}\\approx 0.286$。",
            "prompt": "目标检测 IoU 计算"
        },
        {
            "question": "某二分类视觉模型在测试集中 TP=80，FP=20，FN=10，TN=90。试计算 Precision、Recall 和 Accuracy。",
            "difficulty": "难",
            "answer": "Precision：$\\frac{TP}{TP+FP}=\\frac{80}{80+20}=0.8$。\nRecall：$\\frac{TP}{TP+FN}=\\frac{80}{80+10}\\approx 0.889$。\nAccuracy：$\\frac{TP+TN}{TP+FP+FN+TN}=\\frac{80+90}{80+20+10+90}=0.85$。",
            "prompt": "分类评价指标计算"
        },
        {
            "question": "对一幅单通道图像做 3×3 卷积。某位置邻域为 $\\begin{bmatrix}1&2&1\\\\0&1&0\\\\2&1&2\\end{bmatrix}$，卷积核为 $\\begin{bmatrix}1&0&-1\\\\1&0&-1\\\\1&0&-1\\end{bmatrix}$。忽略卷积核翻转，试计算该位置输出值。",
            "difficulty": "难",
            "answer": "按对应位置相乘再求和：\n$1×1+2×0+1×(-1)+0×1+1×0+0×(-1)+2×1+1×0+2×(-1)$\n$=1+0-1+0+0+0+2+0-2=0$。\n因此该位置输出值为 0。",
            "prompt": "二维卷积计算"
        }
    ],
    "combined": [
        {
            "question": "请简述一个传统计算机视觉处理流程",
            "difficulty": "难",
            "answer": "【传统视觉流程】\n1. 图像采集：通过相机或数据集获取图像；\n2. 预处理：灰度化、去噪、归一化、增强等；\n3. 特征提取：提取边缘、角点、纹理、颜色直方图等特征；\n4. 特征匹配或建模：根据任务进行匹配、分类、检测或几何估计；\n5. 后处理与评估：使用阈值、形态学、RANSAC 或评价指标得到最终结果。"
        },
        {
            "question": "请简述 Canny 边缘检测的主要步骤",
            "difficulty": "难",
            "answer": "【Canny 边缘检测】\n1. 使用高斯滤波平滑图像，降低噪声；\n2. 计算图像梯度幅值和方向；\n3. 进行非极大值抑制，细化边缘；\n4. 使用双阈值区分强边缘、弱边缘和非边缘；\n5. 通过边缘连接保留与强边缘相连的弱边缘。"
        },
        {
            "question": "请比较图像分类、目标检测和图像分割的区别",
            "difficulty": "难",
            "answer": "【三类任务区别】\n1. 图像分类：判断整张图像属于哪个类别，输出通常是类别标签；\n2. 目标检测：判断图像中有哪些目标，并给出类别和边界框；\n3. 图像分割：对像素或区域进行分类，输出更细粒度的空间掩码；\n4. 空间精度从分类到检测再到分割逐步提高，标注成本也通常更高。"
        },
        {
            "question": "请简述卷积神经网络适合图像任务的原因",
            "difficulty": "难",
            "answer": "【CNN 适合图像的原因】\n1. 局部连接能利用图像局部邻域结构；\n2. 权重共享减少参数量，提高计算效率；\n3. 多层卷积可以从边缘、纹理逐步学习到语义特征；\n4. 池化或步幅卷积能降低空间尺寸并增强一定平移鲁棒性；\n5. 端到端训练减少手工设计特征的依赖。"
        },
        {
            "question": "请简述相机标定的目的和常见参数",
            "difficulty": "难",
            "answer": "【相机标定】\n1. 目的：建立三维世界点与二维图像点之间的成像关系；\n2. 内参：焦距、主点、像素尺度等相机内部参数；\n3. 外参：相机相对世界坐标系的旋转和平移；\n4. 畸变参数：描述镜头带来的径向或切向畸变；\n5. 应用：三维重建、测量、位姿估计和增强现实。"
        },
        {
            "question": "请简述目标检测中 IoU 的含义和作用",
            "difficulty": "难",
            "answer": "【IoU 含义与作用】\n1. IoU 是交并比，等于两个区域交集面积除以并集面积；\n2. 在目标检测中常用于衡量预测框与真实框的重叠程度；\n3. IoU 越接近 1，说明位置预测越准确；\n4. 评估时常设置 IoU 阈值判断预测框是否为正确检测；\n5. IoU 也是 mAP 等检测指标计算的重要基础。"
        },
        {
            "question": "请简述形态学腐蚀、膨胀、开运算和闭运算的作用",
            "difficulty": "难",
            "answer": "【形态学操作】\n1. 腐蚀：收缩前景区域，可去除小前景噪声；\n2. 膨胀：扩张前景区域，可连接断裂区域或填补小空洞；\n3. 开运算：先腐蚀后膨胀，常用于去除小噪声并保持主体形状；\n4. 闭运算：先膨胀后腐蚀，常用于填补小孔洞和连接近邻区域；\n5. 操作效果受结构元素形状和大小影响。"
        },
        {
            "question": "请简述特征匹配和 RANSAC 在图像拼接中的作用",
            "difficulty": "难",
            "answer": "【图像拼接中的作用】\n1. 关键点检测：在两幅图像中找到稳定局部点；\n2. 描述子提取：用向量或二进制串描述关键点邻域；\n3. 特征匹配：根据描述子距离找到候选对应点；\n4. RANSAC：剔除错误匹配，鲁棒估计单应矩阵；\n5. 图像变换与融合：按估计几何关系对齐图像并融合。"
        }
    ]
};

export = data;
