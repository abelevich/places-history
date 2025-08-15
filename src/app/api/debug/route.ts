import { NextRequest, NextResponse } from 'next/server'

/**
 * Debug endpoint to test Wikidata connectivity
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const testType = searchParams.get('test') || 'basic'
    
    let testQuery = ''
    let description = ''
    
    switch (testType) {
      case 'basic':
        // Simplest possible query
        testQuery = `
          SELECT ?item ?itemLabel WHERE {
            ?item wdt:P31 wd:Q5 .
            ?item rdfs:label ?itemLabel .
            FILTER(LANG(?itemLabel) = "en")
          }
          LIMIT 3
        `
        description = 'Basic connectivity test (no coordinates)'
        break
        
      case 'coordinates':
        // Test coordinate extraction
        testQuery = `
          SELECT ?item ?itemLabel ?lat ?lng WHERE {
            ?item wdt:P625 ?location .
            ?item wdt:P585 ?date .
            ?item rdfs:label ?itemLabel .
            FILTER(LANG(?itemLabel) = "en")
            BIND(xsd:decimal(strbefore(strafter(str(?location), "Point("), " ")) AS ?lng)
            BIND(xsd:decimal(strbefore(strafter(strafter(str(?location), "Point("), " "), ")")) AS ?lat)
          }
          LIMIT 3
        `
        description = 'Coordinate extraction test'
        break
        
      case 'wikipedia':
        // Test Wikipedia links
        testQuery = `
          SELECT ?item ?itemLabel ?wikipediaUrl WHERE {
            ?item wdt:P585 ?date .
            ?item rdfs:label ?itemLabel .
            FILTER(LANG(?itemLabel) = "en")
            OPTIONAL {
              ?wikipediaArticle schema:about ?item .
              ?wikipediaArticle schema:inLanguage "en" .
              FILTER(STRSTARTS(STR(?wikipediaArticle), "https://en.wikipedia.org/"))
              BIND(?wikipediaArticle AS ?wikipediaUrl)
            }
          }
          LIMIT 3
        `
        description = 'Wikipedia links test'
        break
        
      case 'time':
        // Test time properties
        testQuery = `
          SELECT ?item ?itemLabel ?date WHERE {
            ?item wdt:P585 ?date .
            ?item rdfs:label ?itemLabel .
            FILTER(LANG(?itemLabel) = "en")
          }
          LIMIT 3
        `
        description = 'Time properties test'
        break
        
      default:
        return NextResponse.json(
          { error: 'Invalid test type. Use: basic, coordinates, or time' },
          { status: 400 }
        )
    }
    
    const url = `https://query.wikidata.org/sparql?query=${encodeURIComponent(testQuery)}&format=json`
    
    console.log(`Debug test: ${description}`)
    console.log('Query URL:', url)
    
    const startTime = Date.now()
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Places-History-App/1.0 (https://github.com/your-repo)',
        'Accept': 'application/sparql-results+json'
      },
      signal: AbortSignal.timeout(30000) // 30 second timeout
    })
    
    const responseTime = Date.now() - startTime
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('Debug test failed:', response.status, errorText)
      
      return NextResponse.json({
        success: false,
        test: testType,
        description,
        status: response.status,
        statusText: response.statusText,
        responseTime,
        error: errorText,
        headers: Object.fromEntries(response.headers.entries())
      })
    }
    
    const data = await response.json()
    console.log('Debug test successful:', data)
    
    return NextResponse.json({
      success: true,
      test: testType,
      description,
      status: response.status,
      responseTime,
      resultCount: data.results?.bindings?.length || 0,
      sampleResults: data.results?.bindings?.slice(0, 2) || [],
      fullResponse: data
    })
    
  } catch (error) {
    console.error('Debug endpoint error:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}
