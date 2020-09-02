const puppeteer = require("puppeteer")

async function goScraping() {
  const LAUNCH_OPTION = process.env.DYNO
    ? { args: ["--no-sandbox", "--disable-setuid-sandbox"] }
    : { headless: true }

  const browser = await puppeteer.launch(LAUNCH_OPTION) // Launch Optionの追加
  const page = await browser.newPage()
  await page.setUserAgent(`WDB109 Puppeteer`)

  await page.goto("https://note.mu")
  // タイムラインを取得するまで待機する
  await page.waitFor(() => {
    // 'l-container__body'の最下部よりほんの少し上の位置（ページの無限スクロールが行われる位置）に移動する
    let scroll_y = window.scrollY
    let elm_bottom = document
      .getElementsByClassName("o-container__body")[0]
      .getBoundingClientRect().bottom
    window.scrollTo({ top: scroll_y + elm_bottom - 100, left: 0 })

    const titles = document.querySelectorAll(".o-textNote__title")
    const likes = document.querySelectorAll(".o-noteStatus__item--like")
    return titles.length >= 10 && likes.length >= 10
  })

  // title
  const title_query = ".o-textNote__title"
  const titles = await page.$$eval(title_query, doms =>
    doms.map(dom => ({
      title: dom.innerText,
    }))
  )

  // url
  const url_query = ".o-gridNote__link.a-link"
  const urls = await page.$$eval(url_query, doms =>
    doms.map(dom => ({
      url: dom.href,
    }))
  )

  // name
  const name_query = ".o-timelineFooter__name span"
  const names = await page.$$eval(name_query, doms =>
    doms.map(dom => ({
      name: dom.innerText,
    }))
  )

  const description_query = ".o-textNote__description"
  const descriptions = await page.$$eval(description_query, doms =>
    doms.map(dom => ({
      description: dom.innerText,
    }))
  )

  // like
  const like_query = ".o-noteStatus__item--like"
  const likes = await page.$$eval(like_query, doms =>
    doms.map(dom => ({
      like: parseInt(dom.innerText),
    }))
  )

  // eyecatchs
  const eyecatch_query = ".o-gridNote__eyecatchInner img"
  const eyecatchs = await page.$$eval(eyecatch_query, doms =>
    doms.map(dom => ({
      eyecatch_src: dom.dataset.src,
    }))
  )
  // domの取得が完了したのでclose
  await browser.close()

  const notes = []
  for (let i = 0; i < titles.length; i++) {
    const id = { id: i + 1 }
    const title = titles[i]
    const url = urls[i]
    const name = names[i]
    const description = descriptions[i]
    const like = likes[i]
    const eyecatch = eyecatchs[i]
    notes.push(
      Object.assign({}, id, title, url, name, description, like, eyecatch)
    )
  }

  return notes
}

module.exports = goScraping()
