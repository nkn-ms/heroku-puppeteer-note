const Koa = require("koa")
const Router = require("koa-router")
const bodyParser = require("koa-bodyparser")
const koaSend = require("koa-send")
const findRoot = require("find-root")

const app = new Koa()
const router = new Router()

router.get("/scraping", async (ctx, next) => {
  ctx.set("Access-Control-Allow-Origin", "*")
  ctx.set(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  )
  ctx.body = await crawler() // クローラーの実行
})
router.get("/css/*", async ctx =>
  koaSend(ctx, ctx.path, {
    root: findRoot(__dirname) + "/dist",
  })
)
router.get("/js/*", async ctx =>
  koaSend(ctx, ctx.path, {
    root: findRoot(__dirname) + "/dist",
  })
)
router.get("/", async ctx =>
  koaSend(ctx, ctx.path, {
    root: findRoot(__dirname) + "/dist/index.html",
  })
)
console.log(findRoot(__dirname))

app.use(router.routes())
app.use(router.allowedMethods())
app.use(bodyParser())
app.listen(process.env.PORT || 3000)

// ここからはクローラーのロジック
const puppeteer = require("puppeteer")

const crawler = async () => {
  const browser = await puppeteer.launch({ headless: true })
  const page = await browser.newPage()
  await page.setUserAgent(`WDB109 Puppeteer (${process.env.NOTE_EMAIL})`)
  await page.setViewport({ width: 720, height: 1000 })

  await page.goto("https://note.com")
  // タイムラインが表示されるまで待機する
  await page.waitFor(() => {
    // 追加のタイムラインを取得するため、初期位置より移動する
    window.scrollTo({ top: 1000, left: 0 })

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
