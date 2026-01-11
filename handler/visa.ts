import { chromium } from "playwright";

export default async function exec(
  currencies: CurrenciesJson
): Promise<ResultData> {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const year = now.getFullYear();
  const dateString = `${month}/${day}/${year}`;

  const result: ResultData = {
    timestamp: Math.floor(Date.now() / 1000),
    data: {},
  };

  // 启动浏览器
  const browser = await chromium.launch({
    headless: true,
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  });

  const page = await context.newPage();

  try {
    // 遍历每个货币获取汇率
    for (const currency in currencies) {
      if (currency === "USD") {
        result.data[currency] = 1;
        continue;
      }

      const url = `https://usa.visa.com/cmsapi/fx/rates?amount=1&fee=0&utcConvertedDate=${encodeURIComponent(dateString)}&exchangedate=${encodeURIComponent(dateString)}&fromCurr=${currency}&toCurr=USD`;

      try {
        // 使用浏览器访问API
        const response = await page.goto(url, {
          waitUntil: 'domcontentloaded',
          timeout: 30000
        });

        if (response && response.ok()) {
          const text = await page.textContent('body');
          if (text) {
            try {
              const data = JSON.parse(text);
              if (data && data.convertedAmount) {
                // 移除逗号分隔符，然后解析为浮点数
                const cleanedAmount = data.convertedAmount.replace(/,/g, '');
                result.data[currency] = parseFloat(cleanedAmount);
              } else {
                result.data[currency] = -1;
              }
            } catch (parseError) {
              console.error(`获取 ${currency} 汇率失败`);
              result.data[currency] = -1;
            }
          }
        } else {
          console.error(`获取 ${currency} 汇率失败`);
          result.data[currency] = -1;
        }

        // 避免请求过快
        await page.waitForTimeout(200);
      } catch (error) {
        console.error(`获取 ${currency} 汇率失败`);
        result.data[currency] = -1;
      }
    }

    return result;
  } catch (error) {
    throw error;
  } finally {
    await browser.close();
  }
}
