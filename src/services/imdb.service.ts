import fetch from 'node-fetch'
import * as cheerio from 'cheerio'
import Show from '../models/show.model'

export default class ImdbService
{
    async fetchShowInfo(identifier: string): Promise<Show>
    {
        const html = await fetch(`https://www.imdb.com/title/${identifier}`)
            .then(response => response.text())
        const $ = cheerio.load(html)

        const show = new Show()
        show.identifier = identifier
        show.url = `https://www.imdb.com/title/${identifier}`
        show.type = $('meta[property="og:type"]').attr('content').split('.')[1]
        show.name = $('div.title_wrapper').find('h1').text().trim()
        show.summary = $('div.summary_text').text().trim()
        show.description = $('div#titleStoryLine').find('span:not([class])').html().trim()
        show.alternativeName = this.scrapOriginalTitle($)
        show.duration = this.scrapDuration($)
        show.aggregateRating = this.scrapRating($)
        show.genre = this.scrapGenre($)
        show.poster = this.scrapPosters($)
        show.recommended = this.scrapRecommended($)

        return show
    }

    // region - Private functions
    private scrapOriginalTitle($: CheerioStatic): string
    {
        const el = $('div.originalTitle').html()
        return el ? el.match(/(.+)<span/)[1] : undefined
    }

    private scrapDuration($: CheerioStatic): number
    {
        const duration = $('div.subtext > time').attr('datetime').match(/PT([0-9]+)M/)[1]
        return Number(duration)
    }

    private scrapRating($: CheerioStatic): { ratingValue: number, ratingCount: number }
    {
        return {
            ratingValue: Number($('span[itemprop="ratingValue"]').text()),
            ratingCount: Number($('span[itemprop="ratingCount"]').text()
                .replace(',', ''))
        }
    }

    private scrapGenre($: CheerioStatic): string[]
    {
        const genre: string[] = []
        $('#titleStoryLine > div.inline > h4')
            .filter((_, el) => $(el).text() === 'Genres:')
            .nextAll('a')
            .each((_, el) => {
                genre.push($(el).text().trim())
            })

        return genre
    }

    private scrapPosters($: CheerioStatic): { small: string, big: string }
    {
        const small = $('div.poster > a > img').attr('src')
        const big = small.replace('_V1_UX182_CR0,0,182,268_AL_.jpg',
            '_V1_SY1000_CR0,0,666,1000_AL_.jpg')

        return { small: small, big: big }
    }

    private scrapRecommended($: CheerioStatic): { identifier: string, name: string }[]
    {
        const shows: { identifier: string, name: string }[] = []
        $('div.rec_item').each((_, el) => {
            shows.push({
                identifier: $(el).attr('data-tconst'),
                name: $(el).find('img').attr('title')
            })
        })

        return shows
    }
    // endregion
}