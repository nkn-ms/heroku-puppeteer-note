const Koa = require('koa');
const Router = require('koa-router');
const bodyParser = require('koa-bodyparser');

const app = new Koa();
const router = new Router();

router.get('/', async (ctx, next) => {
  ctx.set('Access-Control-Allow-Origin', '*')
  ctx.body = await crawler(); // クローラーの実行
});

app.use(router.routes());
app.use(router.allowedMethods());
app.use(bodyParser());
app.listen(process.env.PORT || 3000);

// ここからはクローラーのロジック
const puppeteer = require('puppeteer');
// Heroku環境かどうかの判断
const LAUNCH_OPTION = process.env.DYNO ? { args: ['--no-sandbox', '--disable-setuid-sandbox'] } : { headless: false };

const crawler = async () => {
  const browser = await puppeteer.launch(LAUNCH_OPTION)
  const page = await browser.newPage()
  await page.setUserAgent(`WDB109 Puppeteer (${process.env.NOTE_EMAIL})`)

  await page.goto('https://note.mu')
  // タイムラインが表示されるまで待機する
  await page.waitFor(() => {
    // 'o-container__body'の最下部よりほんの少し上の位置（ページの無限スクロールが行われる位置）に移動する
    let scroll_y = window.scrollY
    let elm_bottom = document.getElementsByClassName('o-container__body')[0].getBoundingClientRect().bottom
    window.scrollTo({ top: scroll_y + elm_bottom - 100, left: 0 })

    const titles = document.querySelectorAll('.o-textNote__title a')
    const likes = document.querySelectorAll('.o-noteStatus__item--like')
    return titles.length >= 10 && likes.length >= 10
  })
  const query = '.o-textNote__title a'
  const titles_urls = await page.$$eval(query, doms =>
    doms.map(dom => ({
      title: dom.innerText,
      url: dom.href,
    }))
  )

  const avatar_query = '.o-timelineFooter__avatar'
  const avatars = await page.$$eval(avatar_query, doms =>
    doms.map(dom => {
      return {
        name: dom.querySelectorAll('.o-timelineFooter__name')[0].innerText,
        icon: dom.querySelectorAll('.m-avatar__image')[0].dataset.src,
        date: dom.querySelectorAll('.o-timelineFooter__date')[0].innerText,
      }
    })
  )

  const description_query = '.o-textNote__description'
  const descriptions = await page.$$eval(description_query, doms =>
    doms.map(dom => ({
      description: dom.innerText
    }))
  )

  const like_query = '.o-noteStatus__item--like'
  const likes = await page.$$eval(like_query, doms =>
    doms.map(dom => ({
      like: parseInt(dom.innerText),
    }))
  )

  const eyecatch_query = '.o-textNote__item__eyecatch img'
  const eyecatchs = await page.$$eval(eyecatch_query, doms =>
    doms.map(dom => ({
      eyecatch_src: dom.dataset.src
    }))
  )

  const cardItem_query = '.o-textNote__item'
  const cardItems_className = await page.$$eval(cardItem_query, doms =>
    doms.map(dom => {
      const arr = []
      for (const k of Object.keys(dom.children)) {
        arr.push(dom.children[k].className)
      }
      return arr
    })
  )

  const notes = []
  for (let i = 0; i < titles_urls.length; i++) {
    const id = { id: i + 1 }
    const title_url = titles_urls[i]
    const name_icon_date = avatars[i]
    const description = cardItems_className[i].includes('o-textNote__description') ? descriptions.shift() : { description: null }
    const like = likes[i]
    const eyecatch = cardItems_className[i].findIndex((elm) => elm.indexOf('o-textNote__eyecatch') !== -1) !== -1 ? eyecatchs.shift() : { eyecatch: null }
    notes.push(Object.assign({}, id, title_url, name_icon_date, description, like, eyecatch))
  }
  await browser.close()
  return notes;
}