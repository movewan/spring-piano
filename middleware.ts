import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const pathname = request.nextUrl.pathname

  // 관리자 페이지 보호 (로그인 페이지 제외)
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/students') ||
      pathname.startsWith('/schedule') || pathname.startsWith('/payments') ||
      pathname.startsWith('/feedback')) {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }

    // 관리자 이메일 확인
    if (user.email !== 'admin@springpiano.local') {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  // 학부모 포털 보호
  if (pathname.startsWith('/parent/dashboard') || pathname.startsWith('/parent/attendance') ||
      pathname.startsWith('/parent/feedback')) {
    const parentToken = request.cookies.get('parent_token')?.value

    if (!parentToken) {
      return NextResponse.redirect(new URL('/parent/login', request.url))
    }

    // JWT 검증은 각 페이지/API에서 수행
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
