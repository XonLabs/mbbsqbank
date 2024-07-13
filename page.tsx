'use client';

/**
 * v0 by Vercel.
 * @see https://v0.dev/t/kNfhvWRFnef
 * Documentation: https://v0.dev/docs#integrating-generated-code-into-your-nextjs-app
 */
import Link from 'next/link';
import { PageBody } from '~/core/ui/Page';
import { Badge } from '~/core/ui/ShadCNBadge';
import { Card, CardContent, CardDescription, CardTitle } from '~/core/ui/card';
import AppHeader from '../components/AppHeader';
import useUserSession from '~/core/hooks/use-user-session';
import { useEffect, useState } from 'react';

export default function Component() {
  const userSession = useUserSession();
  const userEmail = userSession?.auth.user.email;

  const [canAccess, setCanAccess] = useState(false);

  useEffect(() => {
    if (
      userEmail?.endsWith('@connect.hku.hk') ||
      userEmail === 'thetechjason@gmail.com'
    ) {
      setCanAccess(true);
    }
  }, [userEmail]);

  console.log('hey zita pick up chocolate??');
  console.log(`
   ______   ______  ___
  |__  / | |_   _|/ _ \\
    / /| |   | | / /_\\ \\
   / /_| |   | |/ /   \\ \\
  /____|_|   |_/_/     \\_\\
  `);

  return (
    <>
      <AppHeader
        title={'MBBS Question Bank (QBank)'}
        description={'Beta Exclusive Access Only'}
      />

      <PageBody>
        <div className="grid grid-cols-1 gap-6 p-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          <Card className="relative overflow-hidden transition-transform duration-300 ease-in-out rounded-lg shadow-lg group hover:shadow-xl hover:-translate-y-2">
            {canAccess ? (
              <Link
                href="/qbank/hkumbbs"
                className="absolute inset-0 z-10"
                prefetch={false}
              >
                <span className="sr-only">View Exam</span>
              </Link>
            ) : (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black bg-opacity-50">
                <span className="text-white font-bold">Access Restricted</span>
                <span className="text-white">
                  Your email address must end with @connect.hku.hk.
                </span>
              </div>
            )}
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-bold">
                    MBBS II Summative
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Only for HKU Med students
                  </CardDescription>
                </div>

                <Badge variant="destructive">Private Beta Access</Badge>
              </div>
              <p className="text-sm">
                Complete QBank composed of all past paper questions for MBBS II
                Summative sorted by topic and year.
              </p>
            </CardContent>
          </Card>
        </div>
      </PageBody>
    </>
  );
}
