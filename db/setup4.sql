-- Afaq site database, part 4: row-level-security policies (no GRANT/REVOKE).

CREATE POLICY "categories_admin" ON public."categories" AS PERMISSIVE FOR ALL TO "authenticated" USING (public.is_site_admin()) WITH CHECK (public.is_site_admin());
CREATE POLICY "categories_read" ON public."categories" AS PERMISSIVE FOR SELECT TO "anonymous", "authenticated" USING (true);

CREATE POLICY "certs_admin" ON public."certificates" AS PERMISSIVE FOR ALL TO "authenticated" USING (public.is_site_admin()) WITH CHECK (public.is_site_admin());
CREATE POLICY "certs_owner_read" ON public."certificates" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((user_id = auth.user_id()));

CREATE POLICY "contact_admin_del" ON public."contact_messages" AS PERMISSIVE FOR DELETE TO "authenticated" USING (public.is_site_admin());
CREATE POLICY "contact_admin_read" ON public."contact_messages" AS PERMISSIVE FOR SELECT TO "authenticated" USING (public.is_site_admin());
CREATE POLICY "contact_admin_write" ON public."contact_messages" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (public.is_site_admin());

CREATE POLICY "courses_admin" ON public."courses" AS PERMISSIVE FOR ALL TO "authenticated" USING (public.is_site_admin()) WITH CHECK (public.is_site_admin());
CREATE POLICY "courses_read" ON public."courses" AS PERMISSIVE FOR SELECT TO "anonymous", "authenticated" USING ((published OR public.is_site_admin()));

CREATE POLICY "enroll_admin_update" ON public."enrollments" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (public.is_site_admin()) WITH CHECK (public.is_site_admin());
CREATE POLICY "enroll_delete" ON public."enrollments" AS PERMISSIVE FOR DELETE TO "authenticated" USING (((user_id = auth.user_id()) OR public.is_site_admin()));
CREATE POLICY "enroll_insert" ON public."enrollments" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (((user_id = auth.user_id()) AND (status = 'pending'::text) AND (EXISTS ( SELECT 1 FROM public.courses c WHERE ((c.id = enrollments.course_id) AND c.published AND c.registration_open)))));
CREATE POLICY "enroll_read" ON public."enrollments" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((user_id = auth.user_id()) OR public.is_site_admin()));
CREATE POLICY "enroll_trainer_read" ON public."enrollments" AS PERMISSIVE FOR SELECT TO "authenticated" USING (public.is_course_trainer(course_id));
CREATE POLICY "enroll_trainer_update" ON public."enrollments" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (public.is_course_trainer(course_id)) WITH CHECK (public.is_course_trainer(course_id));
CREATE POLICY "enroll_update_self" ON public."enrollments" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (((user_id = auth.user_id()))) WITH CHECK (((user_id = auth.user_id()) AND (status = 'pending'::text)));

CREATE POLICY "events_admin" ON public."events" AS PERMISSIVE FOR ALL TO "authenticated" USING (public.is_site_admin()) WITH CHECK (public.is_site_admin());
CREATE POLICY "events_read" ON public."events" AS PERMISSIVE FOR SELECT TO "anonymous", "authenticated" USING ((published OR public.is_site_admin()));

CREATE POLICY "lp_admin" ON public."lesson_progress" AS PERMISSIVE FOR SELECT TO "authenticated" USING (public.is_site_admin());
CREATE POLICY "lp_own" ON public."lesson_progress" AS PERMISSIVE FOR ALL TO "authenticated" USING ((user_id = auth.user_id())) WITH CHECK ((user_id = auth.user_id()));

CREATE POLICY "lessons_read" ON public."lessons" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((public.is_site_admin() OR public.is_course_trainer(course_id) OR (published AND public.is_enrolled(course_id))));
CREATE POLICY "lessons_write" ON public."lessons" AS PERMISSIVE FOR ALL TO "authenticated" USING ((public.is_site_admin() OR public.is_course_trainer(course_id))) WITH CHECK ((public.is_site_admin() OR public.is_course_trainer(course_id)));

CREATE POLICY "views_add" ON public."page_views" AS PERMISSIVE FOR INSERT TO "anonymous", "authenticated" WITH CHECK (true);
CREATE POLICY "views_admin_read" ON public."page_views" AS PERMISSIVE FOR SELECT TO "authenticated" USING (public.is_site_admin());

CREATE POLICY "posts_admin" ON public."posts" AS PERMISSIVE FOR ALL TO "authenticated" USING (public.is_site_admin()) WITH CHECK (public.is_site_admin());
CREATE POLICY "posts_read" ON public."posts" AS PERMISSIVE FOR SELECT TO "anonymous", "authenticated" USING ((published OR public.is_site_admin()));

CREATE POLICY "profiles_self_insert" ON public."profiles" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((id = auth.user_id()));
CREATE POLICY "profiles_self_read" ON public."profiles" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((id = auth.user_id()) OR public.is_site_admin()));
CREATE POLICY "profiles_self_update" ON public."profiles" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (((id = auth.user_id()) OR public.is_site_admin()));

CREATE POLICY "questions_read" ON public."questions" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((public.is_site_admin() OR public.is_quiz_trainer(quiz_id) OR (EXISTS ( SELECT 1 FROM public.quizzes q WHERE ((q.id = questions.quiz_id) AND q.published AND public.is_enrolled(q.course_id))))));
CREATE POLICY "questions_write" ON public."questions" AS PERMISSIVE FOR ALL TO "authenticated" USING ((public.is_site_admin() OR public.is_quiz_trainer(quiz_id))) WITH CHECK ((public.is_site_admin() OR public.is_quiz_trainer(quiz_id)));

CREATE POLICY "attempts_delete" ON public."quiz_attempts" AS PERMISSIVE FOR DELETE TO "authenticated" USING (public.is_site_admin());
CREATE POLICY "attempts_read" ON public."quiz_attempts" AS PERMISSIVE FOR SELECT TO "authenticated" USING (((user_id = auth.user_id()) OR public.is_site_admin() OR public.is_quiz_trainer(quiz_id)));

CREATE POLICY "quizzes_read" ON public."quizzes" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((public.is_site_admin() OR public.is_course_trainer(course_id) OR (published AND public.is_enrolled(course_id))));
CREATE POLICY "quizzes_write" ON public."quizzes" AS PERMISSIVE FOR ALL TO "authenticated" USING ((public.is_site_admin() OR public.is_course_trainer(course_id))) WITH CHECK ((public.is_site_admin() OR public.is_course_trainer(course_id)));

CREATE POLICY "site_admins_manage" ON public."site_admins" AS PERMISSIVE FOR ALL TO "authenticated" USING (public.is_site_admin()) WITH CHECK (public.is_site_admin());

CREATE POLICY "settings_admin" ON public."site_settings" AS PERMISSIVE FOR ALL TO "authenticated" USING (public.is_site_admin()) WITH CHECK (public.is_site_admin());
CREATE POLICY "settings_read" ON public."site_settings" AS PERMISSIVE FOR SELECT TO "anonymous", "authenticated" USING (true);

CREATE POLICY "treq_admin_del" ON public."trainer_requests" AS PERMISSIVE FOR DELETE TO "authenticated" USING (public.is_site_admin());
CREATE POLICY "treq_admin_read" ON public."trainer_requests" AS PERMISSIVE FOR SELECT TO "authenticated" USING (public.is_site_admin());
CREATE POLICY "treq_admin_write" ON public."trainer_requests" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (public.is_site_admin());
CREATE POLICY "treq_own_read" ON public."trainer_requests" AS PERMISSIVE FOR SELECT TO "authenticated" USING (public.is_trainer_email(email));

CREATE POLICY "trainers_admin" ON public."trainers" AS PERMISSIVE FOR ALL TO "authenticated" USING (public.is_site_admin()) WITH CHECK (public.is_site_admin());
CREATE POLICY "trainers_read" ON public."trainers" AS PERMISSIVE FOR SELECT TO "anonymous", "authenticated" USING ((published OR public.is_site_admin()));
CREATE POLICY "trainers_own_read" ON public."trainers" AS PERMISSIVE FOR SELECT TO "authenticated" USING (EXISTS (SELECT 1 FROM public.trainer_access ta WHERE ta.trainer_id = trainers.id AND public.is_trainer_email(ta.account_email)));
CREATE POLICY "trainers_own_update" ON public."trainers" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (EXISTS (SELECT 1 FROM public.trainer_access ta WHERE ta.trainer_id = trainers.id AND public.is_trainer_email(ta.account_email))) WITH CHECK (EXISTS (SELECT 1 FROM public.trainer_access ta WHERE ta.trainer_id = trainers.id AND public.is_trainer_email(ta.account_email)));

CREATE POLICY "access_admin" ON public."trainer_access" AS PERMISSIVE FOR ALL TO "authenticated" USING (public.is_site_admin()) WITH CHECK (public.is_site_admin());
CREATE POLICY "access_self_read" ON public."trainer_access" AS PERMISSIVE FOR SELECT TO "authenticated" USING (public.is_trainer_email(account_email));

CREATE POLICY "vol_admin_del" ON public."volunteer_applications" AS PERMISSIVE FOR DELETE TO "authenticated" USING (public.is_site_admin());
CREATE POLICY "vol_admin_read" ON public."volunteer_applications" AS PERMISSIVE FOR SELECT TO "authenticated" USING (public.is_site_admin());
CREATE POLICY "vol_admin_write" ON public."volunteer_applications" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (public.is_site_admin());
