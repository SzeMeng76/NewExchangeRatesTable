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

      // Helper function to try fetch with a specific date
      const tryFetchRate = async (dateStr: string): Promise<number | null> => {
        const url = `https://usa.visa.com/cmsapi/fx/rates?amount=1&fee=0&utcConvertedDate=${encodeURIComponent(dateStr)}&exchangedate=${encodeURIComponent(dateStr)}&fromCurr=${currency}&toCurr=USD`;

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
                const cleanedAmount = data.convertedAmount.replace(/,/g, '');
                return parseFloat(cleanedAmount);
              }
            } catch (parseError) {
              // JSON parse error
            }
          }
        }
        return null;
      };

      try {
        // Try today's date first
        let rate = await tryFetchRate(dateString);

        // If failed (400 or no data), try yesterday's date
        if (rate === null) {
          const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          const yesterdayMonth = String(yesterday.getMonth() + 1).padStart(2, "0");
          const yesterdayDay = String(yesterday.getDate()).padStart(2, "0");
          const yesterdayYear = yesterday.getFullYear();
          const yesterdayDateString = `${yesterdayMonth}/${yesterdayDay}/${yesterdayYear}`;

          console.log(`${currency}: Today's date failed, trying yesterday: ${yesterdayDateString}`);
          rate = await tryFetchRate(yesterdayDateString);
        }

        if (rate !== null) {
          result.data[currency] = rate;
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
