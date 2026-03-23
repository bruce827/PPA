# Chart HTML Preview

仅在用户明确要求“可运行预览代码”时加载。

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <script src="https://gw.alipayobjects.com/os/lib/antv/g2/4.x/dist/g2.min.js"></script>
</head>
<body>
  <div id="container" style="width:480px;height:320px"></div>
  <script>
    const data = [
      { category: 'A', value: 60 },
      { category: 'B', value: 40 }
    ];
    const chart = new G2.Chart({ container: 'container', autoFit: true, height: 320 });
    chart.data(data);
    chart.interval().position('category*value').color('category');
    chart.render();
  </script>
</body>
</html>
```

