import 'package:flutter/material.dart';
import 'package:frontend/core/constants/app_spacing.dart';
import 'package:frontend/providers/auth_provider.dart';
import 'package:frontend/routes/app_routes.dart';
import 'package:frontend/widgets/app_button.dart';
import 'package:frontend/widgets/app_card.dart';
import 'package:frontend/widgets/app_text_field.dart';

class AuthScreen extends StatefulWidget {
  const AuthScreen({
    super.key,
    required this.authProvider,
  });

  static const String routeName = '/auth';

  final AuthProvider authProvider;

  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  bool _isLogin = true;

  final TextEditingController _nameController = TextEditingController();
  final TextEditingController _locationController = TextEditingController();
  final TextEditingController _emailController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();

  @override
  void dispose() {
    _nameController.dispose();
    _locationController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final authProvider = widget.authProvider;
    final email = _emailController.text.trim();
    final password = _passwordController.text;

    if (email.isEmpty || password.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Email and password are required.')),
      );
      return;
    }

    bool success;
    if (_isLogin) {
      success = await authProvider.signIn(
        email: email,
        password: password,
      );
    } else {
      final name = _nameController.text.trim();
      final location = _locationController.text.trim();

      if (name.isEmpty || location.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Name and location are required.')),
        );
        return;
      }

      success = await authProvider.signUp(
        name: name,
        location: location,
        email: email,
        password: password,
      );
    }

    if (!mounted) {
      return;
    }

    final message = success
        ? (_isLogin
            ? 'Signed in successfully.'
            : 'Account created successfully.')
        : (authProvider.state.message ?? 'Authentication failed.');

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message)),
    );

    if (success) {
      Navigator.of(context).pushNamedAndRemoveUntil(
        AppRoutes.taskRoot,
        (route) => false,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Login / Signup'),
      ),
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 720),
          child: Padding(
            padding: AppSpacing.screenPadding,
            child: AnimatedBuilder(
              animation: widget.authProvider,
              builder: (context, _) {
                final state = widget.authProvider.state;
                final user = state.data;

                return SingleChildScrollView(
                  child: AppCard(
                    child: Padding(
                      padding: AppSpacing.cardPadding,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Welcome',
                            style: theme.textTheme.headlineSmall,
                          ),
                          const SizedBox(height: AppSpacing.xs),
                          Text(
                            user == null
                                ? (_isLogin
                                    ? 'Sign in to continue.'
                                    : 'Create your account to continue.')
                                : 'Signed in as ${user.name}',
                            style: theme.textTheme.bodyMedium,
                          ),
                          const SizedBox(height: AppSpacing.md),
                          Row(
                            children: [
                              Expanded(
                                child: OutlinedButton.icon(
                                  onPressed: widget.authProvider.isMutating
                                      ? null
                                      : () {
                                          setState(() {
                                            _isLogin = true;
                                          });
                                        },
                                  icon: Icon(
                                    Icons.login,
                                    size: 18,
                                    color: _isLogin
                                        ? theme.colorScheme.primary
                                        : theme.colorScheme.onSurface,
                                  ),
                                  label: const Text('Login'),
                                ),
                              ),
                              const SizedBox(width: AppSpacing.xs),
                              Expanded(
                                child: OutlinedButton.icon(
                                  onPressed: widget.authProvider.isMutating
                                      ? null
                                      : () {
                                          setState(() {
                                            _isLogin = false;
                                          });
                                        },
                                  icon: Icon(
                                    Icons.person_add_alt_1,
                                    size: 18,
                                    color: !_isLogin
                                        ? theme.colorScheme.primary
                                        : theme.colorScheme.onSurface,
                                  ),
                                  label: const Text('Signup'),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: AppSpacing.sm),
                          if (!_isLogin) ...[
                            AppTextField(
                              label: 'Full name',
                              controller: _nameController,
                            ),
                            const SizedBox(height: AppSpacing.xs),
                            AppTextField(
                              label: 'Location',
                              controller: _locationController,
                            ),
                            const SizedBox(height: AppSpacing.xs),
                          ],
                          AppTextField(
                            label: 'Email',
                            controller: _emailController,
                            keyboardType: TextInputType.emailAddress,
                          ),
                          const SizedBox(height: AppSpacing.xs),
                          AppTextField(
                            label: 'Password',
                            controller: _passwordController,
                          ),
                          const SizedBox(height: AppSpacing.xs),
                          AppButton(
                            label: widget.authProvider.isMutating
                                ? 'Please wait...'
                                : (_isLogin ? 'Login' : 'Create Account'),
                            onPressed:
                                widget.authProvider.isMutating ? null : _submit,
                          ),
                          const SizedBox(height: AppSpacing.xs),
                          AppButton(
                            label: 'Continue as guest',
                            variant: AppButtonVariant.secondary,
                            onPressed: () {
                              Navigator.of(context).pushNamedAndRemoveUntil(
                                AppRoutes.taskRoot,
                                (route) => false,
                              );
                            },
                          ),
                          if (state.isError) ...[
                            const SizedBox(height: AppSpacing.xs),
                            Text(
                              state.message ?? 'Authentication error.',
                              style: theme.textTheme.bodySmall?.copyWith(
                                color: theme.colorScheme.error,
                              ),
                            ),
                          ],
                          if (user != null) ...[
                            const SizedBox(height: AppSpacing.sm),
                            Text(
                              '${user.location} • Rating ${user.rating.toStringAsFixed(1)}',
                              style: theme.textTheme.bodySmall?.copyWith(
                                color: theme.colorScheme.onSurfaceVariant,
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
        ),
      ),
    );
  }
}
