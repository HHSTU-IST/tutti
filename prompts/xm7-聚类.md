# 聚类

## 作业要求

使用 Jupyter Notebook (.ipynb) 文件进行探索性数据分析（EDA），获取如下信息和完成相应任务，二级列表每项均为10分

- KMeans
  - 可视化簇中心（质心）坐标
  - 可视化肘部法则（不同k值下的SSE）
  - 可视化不同k值下的轮廓系数
  - 可视化每个特征的方差贡献（簇间方差 / 总方差）
  - 对比不同初始化方法的SSE均值和标准差
    - random
    - k-means++
  - 对不同形状数据集聚类，并可视化结果
    - make_blobs
    - make_moons
    - make_circles
- DBSCAN
  - 对比不同邻域半径（`[0.3, 0.5, 0.7]`）的聚类簇数
  - 对比不同核心点阈值（`[5, 10]`）的聚类簇数
  - 可视化K-距离图
  - 对比 DBSCAN vs K-Means 对如下数据集的轮廓系数
    - load_iris
    - make_moons

作业以 .ipynb 文件提交，文件命名模式为：`07-学号-姓名.ipynb`。
